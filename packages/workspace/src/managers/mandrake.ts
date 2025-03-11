import { createLogger, type Logger } from '@mandrake/utils';
import { mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import os from 'os';
import { ToolsManager } from './tools';
import { ModelsManager } from './models';
import { PromptManager } from './prompt';
import { getMandrakePaths, type MandrakePaths, getMandrakeDir } from '../utils/paths';
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
    let resolvedPath;
    if (path) {
      // Handle tilde in custom path if present
      if (path.startsWith('~')) {
        resolvedPath = join(process.env.HOME || os.homedir(), path.substring(1));
      } else {
        resolvedPath = path;
      }
    } else {
      // Default to ~/.mandrake/workspaces/{name}
      resolvedPath = join(getMandrakeDir(), 'workspaces', name);
    }
    
    // Get parent directory for WorkspaceManager
    // If the path ends with the workspace name, use its parent
    // Otherwise, assume it's already the parent dir
    const isFullWorkspacePath = resolvedPath.endsWith(`/${name}`);
    const workspaceParentDir = isFullWorkspacePath 
      ? dirname(resolvedPath)
      : resolvedPath;
    
    this.logger.info('Creating workspace', { 
      name,
      fullPath: isFullWorkspacePath ? resolvedPath : join(workspaceParentDir, name),
      parentDir: workspaceParentDir
    });

    // Create workspace with the ID
    const workspace = new WorkspaceManager(workspaceParentDir, name, workspaceId);
    await workspace.init(description);

    // Register the workspace with the correct full path
    const fullWorkspacePath = join(workspaceParentDir, name);
    await this.config.registerWorkspace({
      id: workspaceId,
      name,
      path: fullWorkspacePath,
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

    // Resolve the workspace path
    let resolvedPath = workspaceInfo.path;
    if (resolvedPath.startsWith('~')) {
      resolvedPath = join(process.env.HOME || os.homedir(), resolvedPath.substring(1));
    }
    
    // The workspace path should end with the workspace name
    // We need the parent directory for the WorkspaceManager
    const isFullWorkspacePath = resolvedPath.endsWith(`/${workspaceInfo.name}`);
    const workspaceParentDir = isFullWorkspacePath
      ? dirname(resolvedPath)
      : resolvedPath;

    this.logger.info('Getting workspace', {
      id,
      name: workspaceInfo.name,
      originalPath: workspaceInfo.path,
      resolvedPath,
      workspaceParentDir,
      isFullWorkspacePath
    });

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

    // Resolve tilde in path if present
    let resolvedPath = workspacePath;
    if (workspacePath.startsWith('~')) {
      resolvedPath = join(process.env.HOME || os.homedir(), workspacePath.substring(1));
    }
    
    // Determine proper parent directory
    const isFullWorkspacePath = resolvedPath.endsWith(`/${name}`);
    const workspaceParentDir = isFullWorkspacePath
      ? dirname(resolvedPath)
      : resolvedPath;

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