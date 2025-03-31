import { Hono } from 'hono';
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
import type { ServiceRegistry } from '../services/registry';
import { MandrakeManagerAdapter, WorkspaceManagerAdapter, MCPManagerAdapter } from '../services/registry/adapters';
import { ConsoleLogger } from '@mandrake/utils';

/**
 * Create routes for workspace management (CRUD operations on workspaces)
 * @param registry Service registry for accessing all managed services
 */
export function workspaceManagementRoutes(registry: ServiceRegistry) {
  const app = new Hono();
  

  // List all workspaces
  app.get('/', async (c) => {
    try {
      // Get MandrakeManager from registry 
      const mandrakeManager = await registry.getMandrakeManager();
      
      // Get workspaces with proper error handling
      let workspaces: any[] = [];
      try {
        const result = await mandrakeManager.listWorkspaces();
        // Ensure we have an array
        workspaces = Array.isArray(result) ? result : [];
      } catch (err) {
        console.warn('Error listing workspaces:', err);
        workspaces = [];
      }
      
      // Ensure we return objects with id, name, description, path
      const workspaceList: WorkspaceListResponse = workspaces.map(ws => ({
        id: ws.id,
        name: ws.name, 
        description: ws.description || null,
        path: ws.path
      }));
      
      return c.json(workspaceList);
    } catch (error) {
      // Return an empty array on error rather than failing completely
      console.error('Failed to list workspaces:', error);
      return c.json([]);
    }
  });
  
  // Create a new workspace
  app.post('/', async (c) => {
    try {
      const mandrakeManager = await registry.getMandrakeManager();
      const data = await c.req.json() as CreateWorkspaceRequest;
      const { name, description, path } = data;
      
      if (!name) {
        return c.json({ error: 'Name is required' }, 400);
      }
      
      if (!path) {
        return c.json({ error: 'Path is required' }, 400);
      }
      
      // This returns a WorkspaceManager instance that's already initialized
      const workspace = await mandrakeManager.createWorkspace(name, description, path);
      
      // Create and register the WorkspaceManagerAdapter
      const wsAdapter = new WorkspaceManagerAdapter(
        workspace,
        {
          logger: new ConsoleLogger({ 
            meta: { service: 'WorkspaceManagerAdapter', workspaceId: workspace.id } 
          })
        }
      );
      
      // Register the workspace with the registry
      registry.registerWorkspaceService(
        workspace.id,
        'workspace-manager',
        wsAdapter,
        {
          dependencies: ['mandrake-manager'],
          initializationPriority: 10
        }
      );
      
      // Initialize an MCPManager for this workspace and set up tools
      const mcpManager = new MCPManager();
      
      // Set up tools for this workspace
      try {
        // Get workspace tool configuration and set up servers
        const active = await workspace.tools.getActive();
        const toolConfigs = await workspace.tools.getConfigSet(active);
        
        // Create and register the MCPManagerAdapter
        const mcpAdapter = new MCPManagerAdapter(
          mcpManager,
          toolConfigs,
          active,
          {
            logger: new ConsoleLogger({ 
              meta: { service: 'MCPManagerAdapter', workspaceId: workspace.id } 
            }),
            workspaceId: workspace.id
          }
        );
        
        // Register the MCP manager with the registry
        registry.registerWorkspaceService(
          workspace.id,
          'mcp-manager',
          mcpAdapter,
          {
            dependencies: ['workspace-manager'],
            initializationPriority: 5
          }
        );
        
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
      
      // Get registered workspace data for the response
      const workspaceData = await mandrakeManager.getWorkspace(workspace.id);
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
        const mandrakeManager = await registry.getMandrakeManager();
        const workspaceData = await mandrakeManager.getWorkspace(workspaceId);
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
  
  // Delete a workspace
  app.delete('/:workspaceId', async (c) => {
    try {
      const workspaceId = c.req.param('workspaceId');
      
      // Get workspace service and clean it up first
      const wsAdapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
        workspaceId, 
        'workspace-manager'
      );
      
      if (wsAdapter) {
        await wsAdapter.cleanup();
      }
      
      // Get MCP manager and clean it up
      const mcpAdapter = registry.getWorkspaceService<MCPManagerAdapter>(
        workspaceId,
        'mcp-manager'
      );
      
      if (mcpAdapter) {
        await mcpAdapter.cleanup();
      }
      
      // Now delete from registry
      const mandrakeManager = await registry.getMandrakeManager();
      await mandrakeManager.deleteWorkspace(workspaceId);
      
      return c.json({ success: true });
    } catch (error) {
      return sendError(c, error, 'Failed to delete workspace');
    }
  });
  
  return app;
}

/**
 * Helper function to resolve workspace paths
 */
export function resolveWorkspacePath(path: string, name: string): string {
  // Resolve tilde in path if present
  let resolvedPath = path;
  if (path.startsWith('~')) {
    resolvedPath = join(process.env.HOME || os.homedir(), path.substring(1));
  }
  
  // Determine if we need to get the parent directory
  const isFullWorkspacePath = resolvedPath.endsWith(`/${name}`);
  return isFullWorkspacePath 
    ? dirname(resolvedPath)
    : resolvedPath;
}