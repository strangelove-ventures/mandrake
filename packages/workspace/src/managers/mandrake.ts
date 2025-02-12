import { createLogger } from '@mandrake/utils';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { ToolsManager } from './tools';
import { ModelsManager } from './models';
import { PromptManager } from './prompt';
import { getMandrakePaths, type MandrakePaths } from '../utils/paths';
import { BaseConfigManager } from './base';
import { mandrakeConfigSchema, type MandrakeConfig } from '../types';
import { validateWorkspaceName } from '../utils/validation';
import { WorkspaceManager } from './workspace';

export class MandrakeManager extends BaseConfigManager<MandrakeConfig> {
  public readonly paths: MandrakePaths;
  public readonly tools: ToolsManager;
  public readonly models: ModelsManager;
  public readonly prompt: PromptManager;

  constructor(root: string) {
    const paths = getMandrakePaths(root);
    super(paths.config, mandrakeConfigSchema, { type: 'mandrake-config' });

    this.paths = paths;
    this.logger = createLogger('workspace').child({
      meta: {
        component: 'mandrake-manager'
      }
    });

    this.tools = new ToolsManager(paths.tools);
    this.models = new ModelsManager(paths.models);
    this.prompt = new PromptManager(paths.prompt);
  }

  async init(): Promise<void> {
    this.logger.info('Initializing mandrake directory', { path: this.paths.root });

    // Create main directory and workspaces directory
    await Promise.all([
      mkdir(this.paths.root, { recursive: true }),
      mkdir(join(this.paths.root, 'workspaces'), { recursive: true })
    ]);

    // Ensure default config exists
    const config = await this.getConfig();
    await this.updateConfig(config);

    // Initialize sub-managers with defaults
    await Promise.all([
      this.tools.list(),
      this.models.get(),
      this.prompt.get(),
    ]);

    this.logger.info('Mandrake directory initialized');
  }

  async getConfig(): Promise<MandrakeConfig> {
    return this.read();
  }

  async updateConfig(updates: Partial<MandrakeConfig>): Promise<void> {
    const current = await this.read();
    await this.write({ ...current, ...updates });
  }

  protected getDefaults(): MandrakeConfig {
    return {
      theme: 'system',
      telemetry: true,
      metadata: {}
    };
  }

  async createWorkspace(name: string, description?: string): Promise<WorkspaceManager> {
    validateWorkspaceName(name);

    // Check if workspace already exists
    const existingWorkspaces = await this.listWorkspaces();
    if (existingWorkspaces.includes(name)) {
      throw new Error(`Workspace "${name}" already exists`);
    }

    // Create workspace
    const workspace = new WorkspaceManager(join(this.paths.root, 'workspaces'), name);
    await workspace.init(description);

    return workspace;
  }

  async getWorkspace(name: string): Promise<WorkspaceManager> {
    validateWorkspaceName(name);

    const workspace = new WorkspaceManager(join(this.paths.root, 'workspaces'), name);
    await workspace.getConfig(); // This will throw if workspace doesn't exist
    return workspace;
  }

  async deleteWorkspace(name: string): Promise<void> {
    validateWorkspaceName(name);
    
    const workspacePath = join(this.paths.root, 'workspaces', name);
    try {
      await rm(workspacePath, { recursive: true, force: true });
      this.logger.info('Workspace deleted', { name });
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async listWorkspaces(): Promise<string[]> {
    const workspacesPath = join(this.paths.root, 'workspaces');
    try {
      const entries = await readdir(workspacesPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}