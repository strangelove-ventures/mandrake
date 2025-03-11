import { Hono, type Context } from 'hono';
import type { Managers, ManagerAccessors } from '../types';
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

/**
 * Create workspace-level routes for the Mandrake API
 * @param managers All available managers
 * @param accessors Functions to access specific managers
 */
export function workspaceRoutes(managers: Managers, accessors: ManagerAccessors) {
  const app = new Hono();
  
  // Mount the workspace management routes
  app.route('/', workspaceManagementRoutes(managers, accessors));
  
  // Create a shared workspace router for specific workspace resources
  const workspaceRouter = new Hono();
  
  // Add middleware to inject workspace resources
  workspaceRouter.use('*', async (c: Context, next) => {
    const workspaceId = c.req.param('workspaceId');
    const workspace = accessors.getWorkspaceManager((workspaceId as string));
    const mcpManager = accessors.getMcpManager((workspaceId as string));
      
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    // Make these available to all subroutes)
    (c as any).set('workspace', workspace);
    (c as any).set('mcpManager', mcpManager);
    (c as any).set('workspaceId', workspaceId);
    
    await next();
  });
  
  // Create wrapper routes that extract necessary managers from context
  function createConfigRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return workspaceConfigRoutes(workspace.config);
  }
  
  function createToolsRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    const mcpManager = c.get('mcpManager') as MCPManager;
    return allToolRoutes(workspace.tools, mcpManager);
  }
  
  function createModelsRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return modelsRoutes(workspace.models);
  }
  
  function createProvidersRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return providersRoutes(workspace.models);
  }
  
  function createPromptRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return promptRoutes(workspace.prompt);
  }
  
  function createFilesRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return filesRoutes(workspace.files);
  }
  
  function createDynamicRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    return dynamicContextRoutes(workspace.dynamic);
  }
  
  function createSessionsRouter(c: any) {
    const workspace = c.get('workspace') as WorkspaceManager;
    const workspaceId = c.get('workspaceId') as string;
    return workspaceSessionDatabaseRoutes(managers, accessors, workspaceId, workspace);
  }
  
  function createStreamingRouter(c: any) {
    const workspaceId = c.get('workspaceId') as string;
    return workspaceSessionStreamingRoutes(managers, accessors, workspaceId);
  }
  
  // Mount resource routes as direct route handlers 
  workspaceRouter.get('/config', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    return c.json(await workspace.config.getConfig());
  });
  
  workspaceRouter.put('/config', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    const config = await c.req.json();
    await workspace.config.updateConfig(config);
    return c.json({ success: true });
  });
  
  // Route for all nested tool routes
  workspaceRouter.all('/tools/*', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    const mcpManager = c.get('mcpManager') as MCPManager;
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
  });
  
  // Define all the endpoints for tool operations
  workspaceRouter.get('/tools/operations', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    const mcpManager = c.get('mcpManager') as MCPManager;
    try {
      const tools = await mcpManager.listAllTools();
      return c.json(tools);
    } catch (error) {
      console.error('Error listing tools:', error);
      return c.json({ error: 'Failed to list tools' }, 500);
    }
  });
  
  // Define specific endpoints for tool configs
  workspaceRouter.get('/tools/configs', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    try {
      const configSets = await workspace.tools.listConfigSets();
      return c.json(configSets);
    } catch (error) {
      console.error('Error listing tool configurations:', error);
      return c.json({ error: 'Failed to list tool configurations' }, 500);
    }
  });
  
  workspaceRouter.post('/tools/configs', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    try {
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
    const workspace = c.get('workspace') as WorkspaceManager;
    const toolId = c.req.param('toolId');
    try {
      const configSet = await workspace.tools.getConfigSet(toolId);
      if (!configSet) {
        return c.json({ error: 'Tool configuration not found' }, 404);
      }
      return c.json(configSet);
    } catch (error) {
      console.error(`Error getting tool configuration ${toolId}:`, error);
      return c.json({ error: `Failed to get tool configuration ${toolId}` }, 500);
    }
  });
  
  // Models routes
  workspaceRouter.all('/models/*', async (c) => {
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
  });
  
  // Providers routes
  workspaceRouter.all('/providers/*', async (c) => {
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
  });
  
  // Prompt routes
  workspaceRouter.all('/prompt/*', async (c) => {
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
  });
  
  // Files routes
  workspaceRouter.all('/files/*', async (c) => {
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
  });
  
  // Dynamic routes
  workspaceRouter.all('/dynamic/*', async (c) => {
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
  });
  
  // Sessions routes
  workspaceRouter.post('/sessions', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    const workspaceId = c.get('workspaceId') as string;
    
    try {
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
  
  workspaceRouter.all('/sessions/*', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    const workspaceId = c.get('workspaceId') as string;
    const sessionsApp = workspaceSessionDatabaseRoutes(managers, accessors, workspaceId, workspace);
    
    const url = new URL(c.req.url);
    const pathParts = url.pathname.split('/');
    const index = pathParts.findIndex(part => part === 'sessions');
    if (index !== -1) {
      const newPathParts = pathParts.slice(index + 1);
      url.pathname = '/' + newPathParts.join('/');
      const newRequest = new Request(url.toString(), c.req.raw);
      return sessionsApp.fetch(newRequest, c.env);
    }
    return c.json({ error: 'Invalid sessions path' }, 404);
  });
  
  // Streaming routes
  workspaceRouter.all('/streaming/*', async (c) => {
    const workspaceId = c.get('workspaceId') as string;
    const streamingApp = workspaceSessionStreamingRoutes(managers, accessors, workspaceId);
    
    const url = new URL(c.req.url);
    const pathParts = url.pathname.split('/');
    const index = pathParts.findIndex(part => part === 'streaming');
    if (index !== -1) {
      const newPathParts = pathParts.slice(index + 1);
      url.pathname = '/' + newPathParts.join('/');
      const newRequest = new Request(url.toString(), c.req.raw);
      return streamingApp.fetch(newRequest, c.env);
    }
    return c.json({ error: 'Invalid streaming path' }, 404);
  });
  
  // Server status routes - these need to be explicit since the nested routing doesn't always work
  workspaceRouter.get('/tools/servers/status', async (c) => {
    const workspace = c.get('workspace') as WorkspaceManager;
    const mcpManager = c.get('mcpManager') as MCPManager;

    try {
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
    const serverId = c.req.param('serverId');
    const mcpManager = c.get('mcpManager') as MCPManager;

    try {
      const serverState = mcpManager.getServerState(serverId);
      if (!serverState) {
        return c.json({ status: 'stopped' });
      }
      return c.json({
        status: 'running',
        state: serverState
      });
    } catch (error) {
      console.error(`Error getting status for server ${serverId}:`, error);
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