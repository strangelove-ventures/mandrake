import { Hono, type Context } from 'hono';
import { allToolRoutes } from './tools';
import { modelsRoutes, providersRoutes } from './models';
import { promptRoutes } from './prompt';
import { workspaceConfigRoutes } from './config';
import { filesRoutes } from './files';
import { dynamicContextRoutes } from './dynamic';
import { workspaceSessionDatabaseRoutes } from './sessions';
import { workspaceSessionStreamingRoutes } from './streaming';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { workspaceManagementRoutes } from './workspace';
import { ServiceRegistry } from '../services/registry';
import { WorkspaceManagerAdapter, MCPManagerAdapter } from '../services/registry/adapters';

/**
 * Create workspace-level routes for the Mandrake API
 * @param registry Service registry for accessing all managed services
 */
export function workspaceRoutes(registry: ServiceRegistry) {
  const app = new Hono();
  
  // Mount the workspace management routes
  app.route('/', workspaceManagementRoutes(registry));
  
  // Create a shared workspace router for specific workspace resources
  const workspaceRouter = new Hono();
  
  // Add middleware to inject workspace resources
  workspaceRouter.use('*', async (c: Context, next) => {
    const workspaceId = c.req.param('workspaceId');
    
    try {
      // Try to get workspace manager from registry
      const wsAdapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
        workspaceId as string, 
        'workspace-manager'
      );
      
      if (!wsAdapter) {
        return c.json({ 
          error: 'Workspace not found',
          message: `No workspace with ID ${workspaceId} found in service registry`
        }, 404);
      }
      
      const workspace = wsAdapter.getManager();
      
      // Try to get MCP manager from registry
      const mcpAdapter = registry.getWorkspaceService<MCPManagerAdapter>(
        workspaceId as string,
        'mcp-manager'
      );
      
      // MCP manager might not be available yet
      const mcpManager = mcpAdapter ? mcpAdapter.getManager() : null;
      
      // Make these available to all subroutes
      (c as any).set('workspace', workspace);
      (c as any).set('mcpManager', mcpManager);
      (c as any).set('workspaceId', workspaceId);
      (c as any).set('registry', registry);
      
      await next();
    } catch (error) {
      console.error(`Error accessing workspace ${workspaceId}:`, error);
      return c.json({ 
        error: 'Error accessing workspace',
        message: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });
  
  // Mount resource routes as direct route handlers 
  workspaceRouter.get('/config', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      return c.json(await workspace.config.getConfig());
    } catch (error) {
      console.error('Error getting workspace config:', error);
      return c.json({ error: 'Failed to get workspace configuration' }, 500);
    }
  });
  
  workspaceRouter.put('/config', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const config = await c.req.json();
      await workspace.config.updateConfig(config);
      return c.json({ success: true });
    } catch (error) {
      console.error('Error updating workspace config:', error);
      return c.json({ error: 'Failed to update workspace configuration' }, 500);
    }
  });
  
  // Route for all nested tool routes
  workspaceRouter.all('/tools/*', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const mcpManager = c.get('mcpManager') as MCPManager;
      
      if (!mcpManager) {
        return c.json({ error: 'MCP manager not available for this workspace' }, 503);
      }
      
      const toolsApp = allToolRoutes(workspace.tools, mcpManager);
      
      // Create a new request with the path modified to strip the /tools prefix
      const url = new URL(c.req.url);
      const pathParts = url.pathname.split('/');
      // Find 'tools' in the path and remove everything up to and including it
      const toolsIndex = pathParts.findIndex(part => part === 'tools');
      if (toolsIndex !== -1) {
        const newPathParts = pathParts.slice(toolsIndex + 1);
        url.pathname = '/' + newPathParts.join('/');
        const newRequest = new Request(url.toString(), c.req.raw);
        return toolsApp.fetch(newRequest, c.env);
      }
      return c.json({ error: 'Invalid tools path' }, 404);
    } catch (error) {
      console.error('Error handling tools route:', error);
      return c.json({ error: 'Failed to handle tools request' }, 500);
    }
  });
  
  // Define all the endpoints for tool operations
  workspaceRouter.get('/tools/operations', async (c) => {
    try {
      const mcpManager = c.get('mcpManager') as MCPManager;
      
      if (!mcpManager) {
        return c.json({ error: 'MCP manager not available for this workspace' }, 503);
      }
      
      const tools = await mcpManager.listAllTools();
      return c.json(tools);
    } catch (error) {
      console.error('Error listing tools:', error);
      return c.json({ error: 'Failed to list tools' }, 500);
    }
  });
  
  // Define specific endpoints for tool configs
  workspaceRouter.get('/tools/configs', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const configSets = await workspace.tools.listConfigSets();
      return c.json(configSets);
    } catch (error) {
      console.error('Error listing tool configurations:', error);
      return c.json({ error: 'Failed to list tool configurations' }, 500);
    }
  });
  
  workspaceRouter.post('/tools/configs', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const config = await c.req.json();
      if (!config.id) {
        return c.json({ error: 'Tool ID is required' }, 400);
      }
      
      // Extract the ID from the config and set up a proper tool config
      const { id } = config;
      
      // Create a minimal valid tool config with just a ripper server configuration
      // Must match the schema in utils/src/types/workspace/tools.ts
      const toolConfig = {
        ripper: {
          command: 'bun',
          args: ['/path/to/dummy.js'] // We need a non-empty array for proper schema validation
        }
      };
      
      await workspace.tools.addConfigSet(id, toolConfig);
      return c.json({ success: true, id }, 201);
    } catch (error) {
      console.error('Error creating tool configuration:', error);
      return c.json({ error: 'Failed to create tool configuration' }, 500);
    }
  });
  
  // Handle specific tool config operations
  workspaceRouter.get('/tools/configs/:toolId', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const toolId = c.req.param('toolId');
      const configSet = await workspace.tools.getConfigSet(toolId);
      if (!configSet) {
        return c.json({ error: 'Tool configuration not found' }, 404);
      }
      return c.json(configSet);
    } catch (error) {
      console.error(`Error getting tool configuration:`, error);
      return c.json({ error: 'Failed to get tool configuration' }, 500);
    }
  });
  
  // Models routes
  workspaceRouter.all('/models/*', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const modelsApp = modelsRoutes(workspace.models);
      
      const url = new URL(c.req.url);
      const pathParts = url.pathname.split('/');
      const modelsIndex = pathParts.findIndex(part => part === 'models');
      if (modelsIndex !== -1) {
        const newPathParts = pathParts.slice(modelsIndex + 1);
        url.pathname = '/' + newPathParts.join('/');
        const newRequest = new Request(url.toString(), c.req.raw);
        return modelsApp.fetch(newRequest, c.env);
      }
      return c.json({ error: 'Invalid models path' }, 404);
    } catch (error) {
      console.error('Error handling models route:', error);
      return c.json({ error: 'Failed to handle models request' }, 500);
    }
  });
  
  // Providers routes
  workspaceRouter.all('/providers/*', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const providersApp = providersRoutes(workspace.models);
      
      const url = new URL(c.req.url);
      const pathParts = url.pathname.split('/');
      const index = pathParts.findIndex(part => part === 'providers');
      if (index !== -1) {
        const newPathParts = pathParts.slice(index + 1);
        url.pathname = '/' + newPathParts.join('/');
        const newRequest = new Request(url.toString(), c.req.raw);
        return providersApp.fetch(newRequest, c.env);
      }
      return c.json({ error: 'Invalid providers path' }, 404);
    } catch (error) {
      console.error('Error handling providers route:', error);
      return c.json({ error: 'Failed to handle providers request' }, 500);
    }
  });
  
  // Prompt routes
  workspaceRouter.all('/prompt/*', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const promptApp = promptRoutes(workspace.prompt);
      
      const url = new URL(c.req.url);
      const pathParts = url.pathname.split('/');
      const index = pathParts.findIndex(part => part === 'prompt');
      if (index !== -1) {
        const newPathParts = pathParts.slice(index + 1);
        url.pathname = '/' + newPathParts.join('/');
        const newRequest = new Request(url.toString(), c.req.raw);
        return promptApp.fetch(newRequest, c.env);
      }
      return c.json({ error: 'Invalid prompt path' }, 404);
    } catch (error) {
      console.error('Error handling prompt route:', error);
      return c.json({ error: 'Failed to handle prompt request' }, 500);
    }
  });
  
  // Files routes
  workspaceRouter.all('/files/*', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const filesApp = filesRoutes(workspace.files);
      
      const url = new URL(c.req.url);
      const pathParts = url.pathname.split('/');
      const index = pathParts.findIndex(part => part === 'files');
      if (index !== -1) {
        const newPathParts = pathParts.slice(index + 1);
        url.pathname = '/' + newPathParts.join('/');
        const newRequest = new Request(url.toString(), c.req.raw);
        return filesApp.fetch(newRequest, c.env);
      }
      return c.json({ error: 'Invalid files path' }, 404);
    } catch (error) {
      console.error('Error handling files route:', error);
      return c.json({ error: 'Failed to handle files request' }, 500);
    }
  });
  
  // Dynamic routes
  workspaceRouter.all('/dynamic/*', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const dynamicApp = dynamicContextRoutes(workspace.dynamic);
      
      const url = new URL(c.req.url);
      const pathParts = url.pathname.split('/');
      const index = pathParts.findIndex(part => part === 'dynamic');
      if (index !== -1) {
        const newPathParts = pathParts.slice(index + 1);
        url.pathname = '/' + newPathParts.join('/');
        const newRequest = new Request(url.toString(), c.req.raw);
        return dynamicApp.fetch(newRequest, c.env);
      }
      return c.json({ error: 'Invalid dynamic path' }, 404);
    } catch (error) {
      console.error('Error handling dynamic route:', error);
      return c.json({ error: 'Failed to handle dynamic request' }, 500);
    }
  });
  
  // Sessions routes
  workspaceRouter.post('/sessions', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const workspaceId = c.get('workspaceId') as string;
      
      const { title, description, metadata } = await c.req.json();
      const session = await workspace.sessions.createSession({ 
        title: title || 'Untitled Session',
        description,
        metadata
      });
      
      // Convert to proper response format
      const response = {
        id: session.id,
        title: session.title,
        description: session.description,
        metadata: session.metadata ? (typeof session.metadata === 'string' ? 
          JSON.parse(session.metadata) : session.metadata) : {},
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };
      return c.json(response, 201);
    } catch (error) {
      console.error('Error creating session:', error);
      return c.json({ error: 'Failed to create session' }, 500);
    }
  });
  
  // Session routes - needs a SessionManagerAdapter to be implemented
  workspaceRouter.all('/sessions/*', async (c) => {
    return c.json({
      error: 'Not implemented yet',
      message: 'The SessionManagerAdapter needs to be implemented before using this route through the ServiceRegistry'
    }, 501);
  });
  
  // Streaming routes - needs a SessionCoordinatorAdapter to be implemented
  workspaceRouter.all('/streaming/*', async (c) => {
    return c.json({
      error: 'Not implemented yet',
      message: 'The SessionCoordinatorAdapter needs to be fully integrated before using this route through the ServiceRegistry'
    }, 501);
  });
  
  // Service status route specific to this workspace
  workspaceRouter.get('/services/status', async (c) => {
    try {
      const workspaceId = c.get('workspaceId') as string;
      
      // Get all workspace services for this workspace
      const statuses = {};
      
      for (const [key, status] of registry.getAllServiceStatuses().entries()) {
        // Only include services for this workspace
        if (key.startsWith(`${workspaceId}:`)) {
          // Extract the service type from the key (after the workspace ID)
          const serviceType = key.split(':')[1];
          statuses[serviceType] = status;
        }
      }
      
      return c.json(statuses);
    } catch (error) {
      console.error('Error getting service status:', error);
      return c.json({ error: 'Failed to get service status' }, 500);
    }
  });
  
  // Server status routes - these need to be explicit since the nested routing doesn't always work
  workspaceRouter.get('/tools/servers/status', async (c) => {
    try {
      const workspace = c.get('workspace') as WorkspaceManager;
      const mcpManager = c.get('mcpManager') as MCPManager;
      
      if (!mcpManager) {
        return c.json({ error: 'MCP manager not available for this workspace' }, 503);
      }

      const serverStatuses = {};

      // Get active tool configuration
      const active = await workspace.tools.getActive();
      const activeConfig = await workspace.tools.getConfigSet(active);

      // Check status for each server in the active config
      for (const [serverId, config] of Object.entries(activeConfig)) {
        if (config.disabled) {
          serverStatuses[serverId] = { status: 'disabled' };
          continue;
        }

        try {
          const serverState = mcpManager.getServerState(serverId);
          serverStatuses[serverId] = {
            status: serverState ? 'running' : 'stopped',
            state: serverState || null,
          };
        } catch (error) {
          serverStatuses[serverId] = {
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      return c.json(serverStatuses);
    } catch (error) {
      console.error('Error getting server status:', error);
      return c.json({ error: 'Failed to get server status' }, 500);
    }
  });

  workspaceRouter.get('/tools/servers/status/:serverId', async (c) => {
    try {
      const serverId = c.req.param('serverId');
      const mcpManager = c.get('mcpManager') as MCPManager;
      
      if (!mcpManager) {
        return c.json({ error: 'MCP manager not available for this workspace' }, 503);
      }

      const serverState = mcpManager.getServerState(serverId);
      if (!serverState) {
        return c.json({ status: 'stopped' });
      }
      return c.json({
        status: 'running',
        state: serverState
      });
    } catch (error) {
      console.error(`Error getting status for server:`, error);
      return c.json({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });
  
  // Mount the workspace router
  app.route('/:workspaceId', workspaceRouter);
  
  return app;
}