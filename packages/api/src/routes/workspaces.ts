import { Hono } from 'hono';
import type { Managers, ManagerAccessors } from '../types';
import { allToolRoutes } from './tools';
import { modelsRoutes, providersRoutes } from './models';
import { promptRoutes } from './prompt';
import { workspaceConfigRoutes } from './config';
import { filesRoutes } from './files';
import { dynamicContextRoutes } from './dynamic';
import { workspaceSessionsRoutes } from './sessions';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { sendError } from './utils';

/**
 * Create workspace-level routes for the Mandrake API
 * @param managers All available managers
 * @param accessors Functions to access specific managers
 */
export function workspaceRoutes(managers: Managers, accessors: ManagerAccessors) {
  const app = new Hono();
  
  // List all workspaces
  app.get('/', async (c) => {
    try {
      const workspaces = await managers.mandrakeManager.listWorkspaces();
      const workspaceList = Object.entries(workspaces).map(([id, config]) => ({
        id,
        name: config.name,
        description: config.description,
        path: config.path
      }));
      return c.json(workspaceList);
    } catch (error) {
      return sendError(c, error, 'Failed to list workspaces');
    }
  });
  
  // Create a new workspace
  app.post('/', async (c) => {
    try {
      const { name, description, path } = await c.req.json();
      
      if (!name || !path) {
        return c.json({ error: 'Name and path are required' }, 400);
      }
      
      const id = await managers.mandrakeManager.createWorkspace(name, description, path);
      
      // Initialize the workspace manager
      await loadWorkspace(
        id, 
        path, 
        managers.workspaceManagers, 
        managers.mcpManagers, 
        managers.sessionCoordinators
      );
      
      const workspace = await managers.mandrakeManager.findWorkspaceById(id);
      return c.json({
        id,
        name: workspace?.name,
        description: workspace?.description,
        path: workspace?.path
      }, 201);
    } catch (error) {
      return sendError(c, error, 'Failed to create workspace');
    }
  });
  
  // Get workspace details
  app.get('/:workspaceId', async (c) => {
    try {
      const workspaceId = c.req.param('workspaceId');
      const workspace = await managers.mandrakeManager.findWorkspaceById(workspaceId);
      
      if (!workspace) {
        return c.json({ error: 'Workspace not found' }, 404);
      }
      
      return c.json({
        id: workspaceId,
        name: workspace.name,
        description: workspace.description,
        path: workspace.path
      });
    } catch (error) {
      return sendError(c, error, 'Failed to get workspace');
    }
  });
  
  // Delete workspace
  app.delete('/:workspaceId', async (c) => {
    try {
      const workspaceId = c.req.param('workspaceId');
      
      // Remove from MandrakeManager
      await managers.mandrakeManager.removeWorkspace(workspaceId);
      
      // Cleanup managers
      const mcpManager = accessors.getMcpManager(workspaceId);
      if (mcpManager) {
        await mcpManager.cleanup();
      }
      
      // Remove from maps
      managers.workspaceManagers.delete(workspaceId);
      managers.mcpManagers.delete(workspaceId);
      managers.sessionCoordinators.delete(workspaceId);
      
      return c.json({ success: true });
    } catch (error) {
      return sendError(c, error, 'Failed to delete workspace');
    }
  });
  
  // Create a sub-router for workspace-specific routes
  const workspaceRouter = new Hono();
  
  // Sub-router middleware to get the workspace manager
  workspaceRouter.use('*', async (c, next) => {
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
  });
  
  // Mount all resource routes using the consistent pattern
  
  // Config routes
  workspaceRouter.route('/config', (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    return workspaceConfigRoutes(workspace.config);
  });
  
  // Tools routes
  workspaceRouter.route('/tools', (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    const mcpManager = c.get('mcpManager') as MCPManager;
    return allToolRoutes(workspace.tools, mcpManager);
  });
  
  // Models routes
  workspaceRouter.route('/models', (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    return modelsRoutes(workspace.models);
  });
  
  // Providers routes
  workspaceRouter.route('/providers', (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    return providersRoutes(workspace.models);
  });
  
  // Prompt routes
  workspaceRouter.route('/prompt', (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    return promptRoutes(workspace.prompt);
  });
  
  // Files routes
  workspaceRouter.route('/files', (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    return filesRoutes(workspace.files);
  });
  
  // Dynamic context routes
  workspaceRouter.route('/dynamic', (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    return dynamicContextRoutes(workspace.dynamic);
  });
  
  // Session routes
  workspaceRouter.route('/sessions', (c) => {
    const workspaceId = c.get('workspaceId') as string;
    const workspace = c.get('workspace') as WorkspaceManager;
    return workspaceSessionsRoutes(managers, accessors, workspaceId, workspace);
  });
  
  // Mount the workspace router
  app.route('/:workspaceId', workspaceRouter);
  
  return app;
}

/**
 * Load a single workspace into memory
 */
async function loadWorkspace(
  id: string,
  path: string,
  workspaceManagers: Map<string, WorkspaceManager>,
  mcpManagers: Map<string, MCPManager>,
  sessionCoordinators: Map<string, Map<string, any>>
): Promise<void> {
  try {
    // Initialize WorkspaceManager
    const ws = new WorkspaceManager(path, id);
    await ws.init(id);
    workspaceManagers.set(ws.id, ws);
    
    // Initialize MCPManager for this workspace
    const mcpManager = new MCPManager();
    
    // Set up tools for this workspace
    try {
      // Get workspace tool configuration and set up servers
      const toolConfigs = await ws.tools.listConfigSets();
      
      // For each tool config, potentially start an MCP server
      for (const [name, config] of Object.entries(toolConfigs)) {
        // Skip if no server configuration is available
        if (!config) continue;
        
        // Try to start the server with the provided config
        try {
          // Only start server if it has a valid command
          const serverConfig = Object.values(config)[0];
          if (serverConfig && serverConfig.command) {
            await mcpManager.startServer(name, config);
          }
        } catch (serverError) {
          console.warn(`Failed to start server for tool ${name}:`, serverError);
          // Continue with other tools even if this one fails
        }
      }
    } catch (toolsError) {
      console.warn(`Error loading tools for workspace ${id}:`, toolsError);
      // Continue workspace initialization even if tools fail
    }
    
    mcpManagers.set(ws.id, mcpManager);
    
    // Initialize empty session coordinators map for this workspace
    sessionCoordinators.set(ws.id, new Map());
    
  } catch (error) {
    console.error(`Error loading workspace ${id}:`, error);
    throw error;
  }
}