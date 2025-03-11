import { Hono } from 'hono';
import type { Managers, ManagerAccessors } from '../types';
import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { join, dirname } from 'path';
import os from 'os';
import { sendError } from './utils';
import type { 
  WorkspaceResponse, 
  WorkspaceListResponse, 
  CreateWorkspaceRequest 
} from '@mandrake/utils/src/types/api';

/**
 * Create routes for workspace management (CRUD operations on workspaces)
 */
export function workspaceManagementRoutes(managers: Managers, accessors: ManagerAccessors)  {
  const app = new Hono();
  
  // List all workspaces
  app.get('/', async (c) => {
    try {
      const workspaces = await managers.mandrakeManager.listWorkspaces();
      // Ensure we return objects with id, name, description, path
      const workspaceList: WorkspaceListResponse = workspaces.map(ws => ({
        id: ws.id,
        name: ws.name, 
        description: ws.description || null,
        path: ws.path
      }));
      return c.json(workspaceList);
    } catch (error) {
      return sendError(c, error, 'Failed to list workspaces');
    }
  });
  
  // Create a new workspace
  app.post('/', async (c) => {
    try {
      const data = await c.req.json() as CreateWorkspaceRequest;
      const { name, description, path } = data;
      
      if (!name) {
        return c.json({ error: 'Name is required' }, 400);
      }
      
      // Path is optional - createWorkspace will use default if not provided
      
      // This returns a WorkspaceManager instance that's already initialized
      const workspace = await managers.mandrakeManager.createWorkspace(name, description, path);
      
      // Add it to the managers map
      managers.workspaceManagers.set(workspace.id, workspace);
      
      // Initialize an MCPManager for this workspace and set up tools
      const mcpManager = new MCPManager();
      
      // Set up tools for this workspace
      try {
        // Get workspace tool configuration and set up servers
        const active = await workspace.tools.getActive();
        const toolConfigs = await workspace.tools.getConfigSet(active);
        
        // For each tool config, potentially start an MCP server
        for (const [toolName, config] of Object.entries(toolConfigs)) {
          if (!config) continue;
          try {
            await mcpManager.startServer(toolName, config);
          } catch (serverError) {
            console.warn(`Failed to start server for tool ${toolName}:`, serverError);
          }
        }
      } catch (toolsError) {
        console.warn(`Error loading tools for workspace ${workspace.id}:`, toolsError);
      }
      
      managers.mcpManagers.set(workspace.id, mcpManager);
      
      // Initialize empty session coordinators map
      managers.sessionCoordinators.set(workspace.id, new Map());
      
      // Get registered workspace data for the response
      const workspaceData = await managers.mandrakeManager.getWorkspace(workspace.id);
      const des = (await workspaceData.config.getConfig()).description;
      
      if (!workspaceData) {
        return c.json({ error: 'Failed to find created workspace' }, 500);
      }
      
      const response: WorkspaceResponse = {
        id: workspace.id,
        name: workspaceData.name,
        description: des || null,
        path: workspaceData.paths.root
      };
      
      return c.json(response, 201);
    } catch (error) {
      return sendError(c, error, 'Failed to create workspace');
    }
  });
  
  // Get workspace details
  app.get('/:workspaceId', async (c) => {
    try {
      const workspaceId = c.req.param('workspaceId');
      
      try {
        const workspaceData = await managers.mandrakeManager.getWorkspace(workspaceId);
        const description = (await workspaceData.config.getConfig()).description;
        
        const response: WorkspaceResponse = {
          id: workspaceId,
          name: workspaceData.name,
          description: description || null,
          path: workspaceData.paths.root
        };
        
        return c.json(response);
      } catch (error) {
        // Specific handling for not found errors
        if ((error as Error).message.includes('not found')) {
          return c.json({ error: 'Workspace not found' }, 404);
        }
        throw error; // Re-throw other errors
      }
    } catch (error) {
      return sendError(c, error, 'Failed to get workspace');
    }
  });
  return app;
}

/**
 * Helper function to create a middleware that injects workspace resources into the context
 */
export function createWorkspaceMiddleware(accessors: ManagerAccessors) {
  return async (c: any, next: () => Promise<void>) => {
    const workspaceId = c.req.param('workspaceId');
    const workspace = accessors.getWorkspaceManager(workspaceId);
    const mcpManager = accessors.getMcpManager(workspaceId);
      
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    // Make these available to all subroutes
    c.set('workspace', workspace);
    c.set('mcpManager', mcpManager);
    c.set('workspaceId', workspaceId);
    
    await next();
  };
}

/**
 * Load a single workspace into memory
 */
export async function loadWorkspace(
  id: string,
  path: string,
  workspaceManagers: Map<string, WorkspaceManager>,
  mcpManagers: Map<string, MCPManager>,
  sessionCoordinators: Map<string, Map<string, any>>,
  mandrakeManager?: MandrakeManager
): Promise<void> {
  try {
    let workspaceName = id;
    if (mandrakeManager) {
      try {
        const workspaceData = await mandrakeManager.getWorkspace(id);
        if (workspaceData) {
          workspaceName = workspaceData.name;
        }
      } catch (error) {
        console.warn(`Error loading workspace ${id} from Mandrake manager:`, error);
        // Continue with the workspace ID as the name if we can't get the workspace data
      }
    }
    
    // Verify path exists before trying to create workspace manager
    if (!path) {
      console.error(`Error loading workspace ${id}: Invalid path`);
      return;
    }
    
    // Resolve tilde in path if present
    let resolvedPath = path;
    if (path.startsWith('~')) {
      resolvedPath = join(process.env.HOME || os.homedir(), path.substring(1));
    }
    
    // Determine if we need to get the parent directory
    const isFullWorkspacePath = resolvedPath.endsWith(`/${workspaceName}`);
    const workspaceParentDir = isFullWorkspacePath 
      ? dirname(resolvedPath)
      : resolvedPath;
    
    console.log(`Loading workspace: ${workspaceName}`, {
      id,
      originalPath: path,
      resolvedPath,
      workspaceParentDir,
      isFullWorkspacePath
    });
    
    const ws = new WorkspaceManager(workspaceParentDir, workspaceName, id);
    await ws.init();
    workspaceManagers.set(ws.id, ws);
    
    const mcpManager = new MCPManager();
    
    try {
      const active = await ws.tools.getActive();
      const toolConfigs = await ws.tools.getConfigSet(active);
      
      for (const [name, config] of Object.entries(toolConfigs)) {
        if (!config) continue;
        try {
          await mcpManager.startServer(name, config);
        } catch (serverError) {
          console.warn(`Failed to start server for tool ${name}:`, serverError);
        }
      }
    } catch (toolsError) {
      console.warn(`Error loading tools for workspace ${id}:`, toolsError);
    }
    
    mcpManagers.set(ws.id, mcpManager);
    
    sessionCoordinators.set(ws.id, new Map());
    
  } catch (error) {
    console.error(`Error loading workspace ${id}:`, error);
    // Don't rethrow the error to prevent the entire workspace loading process from failing
  }
}