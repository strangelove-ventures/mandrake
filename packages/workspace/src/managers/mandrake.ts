import { createLogger } from '@mandrake/utils';
import { mkdir, rm } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { readdir } from 'fs/promises';
import { ToolsManager } from './tools';
import { ModelsManager } from './models';
import { PromptManager } from './prompt';
import { getMandrakePaths, type MandrakePaths } from '../utils/paths';
import { BaseConfigManager } from './base';
import { SessionManager } from './session';
import { mandrakeConfigSchema, type MandrakeConfig, type Workspace } from '../types';
import { validateWorkspaceName } from '../utils/validation';
import { WorkspaceManager } from './workspace';

export class MandrakeManager extends BaseConfigManager<MandrakeConfig> {
  public readonly paths: MandrakePaths;
  public readonly tools: ToolsManager;
  public readonly models: ModelsManager;
  public readonly prompt: PromptManager;

  public readonly sessions: SessionManager;

  constructor(root: string) {
    const paths = getMandrakePaths(root);
    super(paths.config, mandrakeConfigSchema, { type: 'mandrake-config'});

    this.paths = paths;
    this.logger = createLogger('workspace').child({
      meta: {
        component: 'mandrake-manager'
      }
    });

    this.tools = new ToolsManager(paths.tools);
    this.models = new ModelsManager(paths.models);
    this.prompt = new PromptManager(paths.prompt);
    this.sessions = new SessionManager(paths.db);
  }

  async init(): Promise<void> {
    this.logger.info('Initializing mandrake directory', { path: this.paths.root });

    // Create main directory and workspaces directory
    await Promise.all([
      mkdir(this.paths.root, { recursive: true }),
      mkdir(join(this.paths.root, 'workspaces'), { recursive: true })
    ]);
    
    // Initialize sessions
    await this.sessions.init();

    // Ensure default config exists
    const config = await this.getConfig();
    await this.updateConfig(config);

    // Initialize sub-managers with defaults
    await Promise.all([
      this.tools.init(),
      this.models.init(),
      this.prompt.init(),
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
      metadata: {},
      workspaces: []
    };
  }

  async createWorkspace(name: string, description?: string, path?: string): Promise<WorkspaceManager> {
    validateWorkspaceName(name);

    const config = await this.getConfig();
    if (!config.workspaces) {
      config.workspaces = [];
    }
    
    // Check if workspace name already exists
    if ((config.workspaces).some(ws => ws.name === name)) {
      throw new Error(`Workspace "${name}" already exists`);
    }

    // Split path to get directory and name correctly
    const workspacePath = path || join(this.paths.root, 'workspaces', name);
    const workspaceParentDir = dirname(workspacePath);
    const workspaceName = name;

    // Create workspace
    const workspace = new WorkspaceManager(workspaceParentDir, workspaceName);
    await workspace.init(description);

    // Register the workspace
    const wsConfig = await workspace.getConfig();
    await this.registerWorkspace({
      id: wsConfig.id,
      name,
      path: workspacePath,
      description: wsConfig.description,
      lastOpened: new Date().toISOString()
    });

    return workspace;
  }

  async registerWorkspace(workspace: {
    id: string;
    name: string;
    path: string;
    description?: string;
    lastOpened?: string;
  }): Promise<void> {
    const config = await this.getConfig();
    if (!config.workspaces) {
      config.workspaces = [];
    }

    // Check if workspace already exists
    const existingIndex = config.workspaces.findIndex(ws => ws.name === workspace.name);
    if (existingIndex >= 0) {
      // Update existing workspace
      config.workspaces[existingIndex] = {
        ...config.workspaces[existingIndex],
        ...workspace,
        lastOpened: workspace.lastOpened || new Date().toISOString()
      };
    } else {
      // Add new workspace
      config.workspaces.push({
        ...workspace,
        lastOpened: workspace.lastOpened || new Date().toISOString()
      });
    }

    await this.updateConfig(config);
  }

  async getWorkspace(name: string): Promise<WorkspaceManager> {
    validateWorkspaceName(name);

    const config = await this.getConfig();
    if (!config.workspaces) {
      config.workspaces = [];
    }
    
    // Find workspace in registry
    const workspaceInfo = config.workspaces.find(ws => ws.name === name);

    if (!workspaceInfo) {
      // Try legacy path for backward compatibility
      const legacyWorkspace = new WorkspaceManager(join(this.paths.root, 'workspaces'), name);
      try {
        const wsConfig = await legacyWorkspace.getConfig();

        // Register it if found
        await this.registerWorkspace({
          id: wsConfig.id,
          name,
          path: join(this.paths.root, 'workspaces', name),
          description: wsConfig.description,
          lastOpened: new Date().toISOString()
        });

        return legacyWorkspace;
      } catch (error) {
        throw new Error(`Workspace "${name}" not found`);
      }
    }

    // Update last opened timestamp
    await this.updateWorkspaceTimestamp(name);

    // Get workspace directory from the path
    const workspaceParentDir = dirname(workspaceInfo.path);
    const workspaceName = name; // Use the name, not basename

    const workspace = new WorkspaceManager(workspaceParentDir, workspaceName);
    await workspace.getConfig(); // This will throw if workspace doesn't exist
    return workspace;
  }

  async updateWorkspaceTimestamp(name: string): Promise<void> {
    const config = await this.getConfig();
    if (!config.workspaces) {
      config.workspaces = [];
    }

    const workspaceIndex = config.workspaces.findIndex(ws => ws.name === name);

    if (workspaceIndex >= 0) {
      config.workspaces[workspaceIndex].lastOpened = new Date().toISOString();
      await this.updateConfig(config);
    }
  }

  async deleteWorkspace(name: string): Promise<void> {
    validateWorkspaceName(name);

    // Find workspace in registry
    const config = await this.getConfig();
    if (!config.workspaces) {
      config.workspaces = [];
    }

    const workspaceInfo = config.workspaces.find(ws => ws.name === name);

    if (!workspaceInfo) {
      // Try legacy path for backward compatibility
      const workspacePath = join(this.paths.root, 'workspaces', name);
      try {
        await rm(workspacePath, { recursive: true, force: true });
        this.logger.info('Legacy workspace deleted', { name });
        return;
      } catch (error) {
        if ((error as any)?.code !== 'ENOENT') {
          throw error;
        }
        throw new Error(`Workspace "${name}" not found`);
      }
    }

    // Remove from registry
    config.workspaces = config.workspaces.filter(ws => ws.name !== name);
    await this.updateConfig(config);

    // Delete the workspace files
    try {
      await rm(workspaceInfo.path, { recursive: true, force: true });
      this.logger.info('Workspace deleted', { name, path: workspaceInfo.path });
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error;
      }
      this.logger.info('Workspace unregistered (files not found)', { name, path: workspaceInfo.path });
    }
  }

  async unregisterWorkspace(name: string): Promise<void> {
    validateWorkspaceName(name);

    // Find workspace in registry
    const config = await this.getConfig();
    if (!config.workspaces) {
      config.workspaces = [];
    }

    const workspaceInfo = config.workspaces.find(ws => ws.name === name);

    if (!workspaceInfo) {
      throw new Error(`Workspace "${name}" not found`);
    }

    // Remove from registry
    config.workspaces = config.workspaces.filter(ws => ws.name !== name);
    await this.updateConfig(config);

    this.logger.info('Workspace unregistered', { name });
  }

  async listWorkspaces(): Promise<{
    name: string;
    path: string;
    description?: string;
    lastOpened?: string;
  }[]> {
    // Get registered workspaces
    const config = await this.getConfig();
    if (!config.workspaces) {
      config.workspaces = [];
    }

    const registeredWorkspaces = config.workspaces;

    // For backward compatibility, also check legacy workspaces directory
    try {
      const workspacesPath = join(this.paths.root, 'workspaces');
      const entries = await readdir(workspacesPath, { withFileTypes: true });
      const legacyWorkspaces = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      // Add any legacy workspaces that aren't already registered
      for (const name of legacyWorkspaces) {
        if (!registeredWorkspaces.some(ws => ws.name === name)) {
          try {
            const legacyWorkspace = new WorkspaceManager(join(this.paths.root, 'workspaces'), name);
            const wsConfig = await legacyWorkspace.getConfig();

            // Register it
            registeredWorkspaces.push({
              id: wsConfig.id,
              name,
              path: join(this.paths.root, 'workspaces', name),
              description: wsConfig.description
            });
          } catch (error) {
            // Skip if can't read config
            this.logger.warn('Could not read legacy workspace config', { name, error });
          }
        }
      }

      // Save updated registry
      if (registeredWorkspaces.length !== config.workspaces.length) {
        await this.updateConfig({ ...config, workspaces: registeredWorkspaces });
      }

    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        this.logger.error('Error reading workspaces directory', { error });
      }
    }

    return registeredWorkspaces.map(ws => ({
      name: ws.name,
      path: ws.path,
      description: ws.description,
      lastOpened: ws.lastOpened
    }));
  }
}