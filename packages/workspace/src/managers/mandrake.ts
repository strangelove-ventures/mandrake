import { createLogger, type Logger } from '@mandrake/utils';
import { mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { ToolsManager } from './tools';
import { ModelsManager } from './models';
import { PromptManager } from './prompt';
import { getMandrakePaths, type MandrakePaths } from '../utils/paths';
import { SessionManager } from './session';
import { validateWorkspaceName } from '../utils/validation';
import { WorkspaceManager } from './workspace';
import { MandrakeConfigManager } from './mandrakeConfig';

export class MandrakeManager {
  public readonly paths: MandrakePaths;
  public readonly tools: ToolsManager;
  public readonly models: ModelsManager;
  public readonly prompt: PromptManager;
  public readonly sessions: SessionManager;
  public readonly config: MandrakeConfigManager;
  public readonly logger: Logger;

  constructor(root: string) {
    const paths = getMandrakePaths(root);
    this.paths = paths;

    this.logger = createLogger('workspace').child({
      meta: {
        component: 'mandrake-manager'
      }
    });

    this.config = new MandrakeConfigManager(paths.config);
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

    // Initialize all components
    await Promise.all([
      this.config.init(),
      this.sessions.init(),
      this.tools.init(),
      this.models.init(),
      this.prompt.init(),
    ]);

    this.logger.info('Mandrake directory initialized');
  }

  async createWorkspace(name: string, description?: string, path?: string): Promise<WorkspaceManager> {
    validateWorkspaceName(name);

    // Check if workspace name already exists
    const existingWorkspace = await this.config.findWorkspaceByName(name);
    if (existingWorkspace) {
      throw new Error(`Workspace "${name}" already exists`);
    }

    // Generate a workspace ID
    const workspaceId = crypto.randomUUID();

    // Determine workspace path
    const workspacePath = path || join(this.paths.root, 'workspaces', name);
    const workspaceParentDir = dirname(workspacePath);

    // Create workspace with the ID
    const workspace = new WorkspaceManager(workspaceParentDir, name, workspaceId);
    await workspace.init(description);

    // Register the workspace
    await this.config.registerWorkspace({
      id: workspaceId,
      name,
      path: workspacePath,
      description,
      lastOpened: new Date().toISOString()
    });

    return workspace;
  }

  async getWorkspace(id: string): Promise<WorkspaceManager> {
    // Find workspace by ID in registry
    const workspaceInfo = await this.config.findWorkspaceById(id);

    if (!workspaceInfo) {
      throw new Error(`Workspace with ID "${id}" not found`);
    }

    // Update last opened timestamp
    await this.config.updateWorkspaceTimestamp(id);

    // Get workspace directory from the path
    const workspaceParentDir = dirname(workspaceInfo.path);

    const workspace = new WorkspaceManager(workspaceParentDir, workspaceInfo.name, workspaceInfo.id);

    // Verify the workspace exists on disk
    try {
      await workspace.config.getConfig();
    } catch (error) {
      throw new Error(`Workspace with ID "${id}" exists in registry but not on disk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return workspace;
  }

  async deleteWorkspace(id: string): Promise<void> {
    // Find workspace in registry
    const workspaceInfo = await this.config.findWorkspaceById(id);

    if (!workspaceInfo) {
      throw new Error(`Workspace with ID "${id}" not found`);
    }

    // Remove from registry
    await this.config.unregisterWorkspaceById(id);

    // Delete the workspace files
    try {
      await rm(workspaceInfo.path, { recursive: true, force: true });
      this.logger.info('Workspace deleted', { id, path: workspaceInfo.path });
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error;
      }
      this.logger.info('Workspace unregistered (files not found)', { id, path: workspaceInfo.path });
    }
  }

  async unregisterWorkspace(id: string): Promise<void> {
    const workspaceInfo = await this.config.unregisterWorkspaceById(id);

    if (!workspaceInfo) {
      throw new Error(`Workspace with ID "${id}" not found`);
    }

    this.logger.info('Workspace unregistered', { id, name: workspaceInfo.name });
  }

  async adoptWorkspace(name: string, workspacePath: string, description?: string): Promise<WorkspaceManager> {
    validateWorkspaceName(name);

    // Check if workspace name already exists
    const existingWorkspace = await this.config.findWorkspaceByName(name);
    if (existingWorkspace) {
      throw new Error(`Workspace "${name}" already exists`);
    }

    const workspaceParentDir = dirname(workspacePath);

    try {
      // Get the existing workspace config to extract the ID
      const tempWorkspace = new WorkspaceManager(workspaceParentDir, name, '');
      const wsConfig = await tempWorkspace.config.getConfig();

      // Register in the Mandrake registry
      await this.config.registerWorkspace({
        id: wsConfig.id,
        name,
        path: workspacePath,
        description: description || wsConfig.description,
        lastOpened: new Date().toISOString()
      });

      // Return a workspace manager with the correct ID
      return new WorkspaceManager(workspaceParentDir, name, wsConfig.id);
    } catch (error) {
      throw new Error(`Cannot adopt "${workspacePath}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listWorkspaces(): Promise<{
    id: string;
    name: string;
    path: string;
    description?: string;
    lastOpened?: string;
  }[]> {
    return await this.config.listWorkspaces();
  }
}