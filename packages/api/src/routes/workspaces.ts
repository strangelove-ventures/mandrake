import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { allToolRoutes } from './tools';
import { modelsRoutes, providersRoutes } from './models';
import { promptRoutes } from './prompt';
import { filesRoutes } from './files';
import { dynamicContextRoutes } from './dynamic';
import { workspaceSessionDatabaseRoutes } from './sessions';
import { workspaceSessionStreamingRoutes } from './streaming';
import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { workspaceManagementRoutes } from './workspace';
import type { ServiceRegistry } from '../services/registry';
import { 
  WorkspaceManagerAdapter, 
  MCPManagerAdapter, 
  SessionCoordinatorAdapter,
  MandrakeManagerAdapter
} from '../services/registry/adapters';
import type { Managers, ManagerAccessors } from '../types';

/**
 * Create a properly structured Managers object for a workspace
 * @param registry The service registry
 * @param workspace The workspace manager instance
 * @param mcpManager The MCP manager instance
 * @param workspaceId The workspace ID
 * @returns A Managers object that conforms to the expected interface
 */
function createWorkspaceManagersObject(
  registry: ServiceRegistry,
  workspace: WorkspaceManager,
  mcpManager: MCPManager,
  workspaceId: string
): Managers {
  // Get the MandrakeManager from registry
  const mandrakeAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
  const mandrakeManager = mandrakeAdapter ? mandrakeAdapter.getManager() : null;
  
  if (!mandrakeManager) {
    throw new Error('MandrakeManager not available in the registry');
  }
  
  // Get the system MCP manager
  const mcpAdapter = registry.getService<MCPManagerAdapter>('mcp-manager');
  const systemMcpManager = mcpAdapter ? mcpAdapter.getManager() : null;
  
  if (!systemMcpManager) {
    throw new Error('System MCPManager not available in the registry');
  }
  
  // Create system session coordinators map
  const systemSessionCoordinators = new Map<string, SessionCoordinator>();
  
  // Create workspace managers map and add this workspace
  const workspaceManagers = new Map<string, WorkspaceManager>();
  workspaceManagers.set(workspaceId, workspace);
  
  // Create MCP managers map and add this workspace's MCP manager
  const mcpManagers = new Map<string, MCPManager>();
  mcpManagers.set(workspaceId, mcpManager);
  
  // Create session coordinators map for this workspace
  const sessionCoordinators = new Map<string, Map<string, SessionCoordinator>>();
  sessionCoordinators.set(workspaceId, new Map<string, SessionCoordinator>());
  
  // Return properly structured Managers object
  return {
    mandrakeManager,
    systemMcpManager,
    systemSessionCoordinators,
    workspaceManagers,
    mcpManagers,
    sessionCoordinators
  };
}

/**
 * Create a properly implemented ManagerAccessors object for a workspace
 * @param registry The service registry
 * @param workspaceId The workspace ID
 * @returns An accessors object with functions to access workspace services
 */
function createWorkspaceAccessorsObject(
  registry: ServiceRegistry,
  workspaceId: string
): ManagerAccessors {
  // Create a persistent map to track session coordinators across function calls
  const coordinatorMaps = new Map<string, Map<string, SessionCoordinator>>();
  coordinatorMaps.set(workspaceId, new Map<string, SessionCoordinator>());
  
  return {
    // Get workspace manager from registry by ID
    getWorkspaceManager: (wsId: string) => {
      // For the current workspace, we already have it
      if (wsId === workspaceId) {
        const adapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
          wsId, 
          'workspace-manager'
        );
        return adapter ? adapter.getManager() : undefined;
      }
      
      // For other workspaces, use the registry to look it up
      const adapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
        wsId, 
        'workspace-manager'
      );
      return adapter ? adapter.getManager() : undefined;
    },
    
    // Get MCP manager from registry by workspace ID
    getMcpManager: (wsId: string) => {
      // For the current workspace, we already have it
      if (wsId === workspaceId) {
        const adapter = registry.getWorkspaceService<MCPManagerAdapter>(
          wsId, 
          'mcp-manager'
        );
        return adapter ? adapter.getManager() : undefined;
      }
      
      // For other workspaces, use the registry to look it up
      const adapter = registry.getWorkspaceService<MCPManagerAdapter>(
        wsId, 
        'mcp-manager'
      );
      return adapter ? adapter.getManager() : undefined;
    },
    
    // Get session coordinator for a specific workspace and session
    getSessionCoordinator: (wsId: string, sessionId: string) => {
      // Check if we already have this coordinator in our maps
      const coordMap = coordinatorMaps.get(wsId);
      if (coordMap && coordMap.has(sessionId)) {
        return coordMap.get(sessionId);
      }
      
      // Try to get the coordinator adapter from the registry
      const coordinatorAdapter = registry.getWorkspaceService<SessionCoordinatorAdapter>(
        wsId,
        'session-coordinator'
      );
      
      if (coordinatorAdapter) {
        // Get its coordinator instance
        const coordinator = coordinatorAdapter.getCoordinator();
        
        // Store it in our map for future use
        if (coordinator) {
          const wsMap = coordinatorMaps.get(wsId) || new Map<string, SessionCoordinator>();
          wsMap.set(sessionId, coordinator);
          if (!coordinatorMaps.has(wsId)) {
            coordinatorMaps.set(wsId, wsMap);
          }
          return coordinator;
        }
      }
      
      return undefined;
    },
    
    // Get the coordinators map for a workspace
    getSessionCoordinatorMap: (wsId: string) => {
      // If we don't have a map for this workspace, create one
      if (!coordinatorMaps.has(wsId)) {
        coordinatorMaps.set(wsId, new Map<string, SessionCoordinator>());
      }
      
      return coordinatorMaps.get(wsId);
    },
    
    // Create a session coordinator
    createSessionCoordinator: (wsId: string, sessionId: string, coordinator: SessionCoordinator) => {
      // Get or create the map for this workspace
      if (!coordinatorMaps.has(wsId)) {
        coordinatorMaps.set(wsId, new Map<string, SessionCoordinator>());
      }
      
      // Add the coordinator to the map
      (coordinatorMaps.get(wsId) as any).set(sessionId, coordinator);
    },
    
    // Remove a session coordinator
    removeSessionCoordinator: (wsId: string, sessionId: string) => {
      // Get the map for this workspace
      const coordMap = coordinatorMaps.get(wsId);
      
      // Remove the coordinator if it exists
      if (coordMap && coordMap.has(sessionId)) {
        coordMap.delete(sessionId);
        return true;
      }
      
      return false;
    }
  };
};

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
  
  // Helper to get workspace manager
  const getWorkspaceManager = (workspaceId: string) => {
    const wsAdapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
      workspaceId, 
      'workspace-manager'
    );
    
    if (!wsAdapter) {
      throw new Error(`Workspace manager for ${workspaceId} not found in registry`);
    }
    
    return wsAdapter.getManager();
  };
  
  // Helper to get MCP manager
  const getMcpManager = (workspaceId: string) => {
    const mcpAdapter = registry.getWorkspaceService<MCPManagerAdapter>(
      workspaceId,
      'mcp-manager'
    );
    
    if (!mcpAdapter) {
      throw new Error(`MCP manager for ${workspaceId} not found in registry`);
    }
    
    return mcpAdapter.getManager();
  };
  
  // Helper to get session coordinator (future use)
  const getSessionCoordinator = (workspaceId: string) => {
    const sessionAdapter = registry.getWorkspaceService<SessionCoordinatorAdapter>(
      workspaceId,
      'session-coordinator'
    );
    
    if (!sessionAdapter) {
      throw new Error(`Session coordinator for ${workspaceId} not found in registry`);
    }
    
    return sessionAdapter.getCoordinator();
  };
  
  // Middleware to validate workspace and add it to context
  const workspaceMiddleware: MiddlewareHandler = async (c, next) => {
    const workspaceId = c.req.param('workspaceId');
    
    if (!workspaceId) {
      return c.json({ 
        error: 'Workspace ID is required', 
        message: 'No workspace ID found in request path'
      }, 400);
    }
    
    try {
      // Try to get workspace manager from registry - will be created if factory registered
      const wsAdapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
        workspaceId, 
        'workspace-manager'
      );
      
      if (!wsAdapter) {
        return c.json({ 
          error: 'Workspace not found',
          message: `No workspace with ID ${workspaceId} found in service registry`
        }, 404);
      }
      
      // Add workspaceId to the context for later use
      c.set('workspaceId', workspaceId);
      
      await next();
    } catch (error) {
      console.error(`Error accessing workspace ${workspaceId}:`, error);
      return c.json({ 
        error: 'Error accessing workspace',
        message: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  };
  
  // Apply the middleware to all routes
  workspaceRouter.use('*', workspaceMiddleware);
  
  // Config routes
  try {
    // Config GET route
    workspaceRouter.get('/config', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId');
        const workspace = getWorkspaceManager(workspaceId);
        return c.json(await workspace.config.getConfig());
      } catch (error) {
        console.error('Error getting workspace config:', error);
        return c.json({ error: 'Failed to get workspace configuration' }, 500);
      }
    });
    
    // Config PUT route
    workspaceRouter.put('/config', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        const config = await c.req.json();
        await workspace.config.updateConfig(config);
        return c.json({ success: true });
      } catch (error) {
        console.error('Error updating workspace config:', error);
        return c.json({ error: 'Failed to update workspace configuration' }, 500);
      }
    });
  } catch (error) {
    console.error('Error setting up config routes:', error);
    workspaceRouter.get('/config', (c) => {
      return c.json({ error: 'Config service unavailable' }, 503);
    });
    workspaceRouter.get('/config/*', (c) => {
      return c.json({ error: 'Config service unavailable' }, 503);
    });
  }
  
  // Tools routes
  try {
    // Route for all nested tool routes
    workspaceRouter.all('/tools/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        
        let mcpManager;
        try {
          mcpManager = getMcpManager(workspaceId);
        } catch (error) {
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
        const workspaceId = (c as any).get('workspaceId') as string;
        
        let mcpManager;
        try {
          mcpManager = getMcpManager(workspaceId);
        } catch (error) {
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
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        const configSets = await workspace.tools.listConfigSets();
        return c.json(configSets);
      } catch (error) {
        console.error('Error listing tool configurations:', error);
        return c.json({ error: 'Failed to list tool configurations' }, 500);
      }
    });
    
    workspaceRouter.post('/tools/configs', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        const config = await c.req.json();
        
        if (!config.id) {
          return c.json({ error: 'Tool ID is required' }, 400);
        }
        
        // Extract the ID and tool configuration
        const { id, ...toolConfig } = config;
        
        // Add the config
        await workspace.tools.addConfigSet(id, toolConfig);
        
        // Check if this is the active configuration
        const activeConfig = await workspace.tools.getActive();
        if (activeConfig === id) {
          // If this is active, start the server
          try {
            await mcpManager.startServer(id, toolConfig);
            console.log(`Started server for new tool configuration ${id}`);
          } catch (serverError) {
            console.warn(`Failed to start server for new tool ${id}:`, serverError);
            // We don't fail the request if server start fails, since the config was saved
          }
        }
        
        return c.json({ success: true, id }, 201);
      } catch (error) {
        console.error('Error creating tool configuration:', error);
        return c.json({ error: 'Failed to create tool configuration' }, 500);
      }
    });
    
    // Handle specific tool config operations
    workspaceRouter.get('/tools/configs/:toolId', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
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
    
    // Update a specific tool configuration
    workspaceRouter.put('/tools/configs/:toolId', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const toolId = c.req.param('toolId');
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        const configUpdate = await c.req.json();
        
        // Update the configuration
        await workspace.tools.updateConfigSet(toolId, configUpdate);
        
        // Check if this is the active configuration
        const activeConfig = await workspace.tools.getActive();
        if (activeConfig === toolId) {
          // If this is active, restart the server with new config
          try {
            // First check if server is already running
            let isRunning = false;
            try {
              const server = mcpManager.getServer(toolId);
              isRunning = !!server;
            } catch (error) {
              isRunning = false;
            }
            
            if (isRunning) {
              // If running, restart the server
              await mcpManager.restartServer(toolId);
              console.log(`Restarted server for updated tool configuration ${toolId}`);
            } else {
              // If not running, start it
              await mcpManager.startServer(toolId, configUpdate);
              console.log(`Started server for updated tool configuration ${toolId}`);
            }
          } catch (serverError) {
            console.warn(`Failed to update server for tool ${toolId}:`, serverError);
            // We don't fail the request if server restart fails
          }
        }
        
        return c.json({ success: true, id: toolId });
      } catch (error) {
        console.error(`Error updating tool configuration ${c.req.param('toolId')}:`, error);
        return c.json({ error: 'Failed to update tool configuration' }, 500);
      }
    });
    
    // Get active tool configuration
    workspaceRouter.get('/tools/configs/active', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        
        const activeId = await workspace.tools.getActive();
        const activeConfig = await workspace.tools.getConfigSet(activeId);
        
        return c.json({ 
          active: activeId,
          config: activeConfig || null
        });
      } catch (error) {
        console.error('Error getting active tool configuration:', error);
        return c.json({ error: 'Failed to get active tool configuration' }, 500);
      }
    });
    
    // Set active tool config and update MCP servers
    workspaceRouter.put('/tools/configs/active', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        const { id } = await c.req.json();
        
        if (!id) {
          return c.json({ error: 'Configuration ID is required' }, 400);
        }
        
        // Verify the configuration exists
        const newConfig = await workspace.tools.getConfigSet(id);
        if (!newConfig) {
          return c.json({ error: `Configuration '${id}' not found` }, 404);
        }
        
        // Get current active config before changing it
        const previousActive = await workspace.tools.getActive();
        
        // Update the active configuration
        await workspace.tools.setActive(id);
        
        // Stop all currently running servers from previous config
        if (previousActive && previousActive !== id) {
          try {
            const previousConfig = await workspace.tools.getConfigSet(previousActive);
            if (previousConfig) {
              // Stop all servers from previous configuration
              for (const [serverId] of Object.entries(previousConfig)) {
                try {
                  await mcpManager.stopServer(serverId);
                  console.log(`Stopped server ${serverId} from previous configuration`);
                } catch (stopError) {
                  console.warn(`Error stopping server ${serverId}:`, stopError);
                  // Continue with other servers
                }
              }
            }
          } catch (error) {
            console.warn(`Error cleaning up previous config:`, error);
            // Continue with setting up new config
          }
        }
        
        // Start servers for the new active configuration
        for (const [serverId, serverConfig] of Object.entries(newConfig)) {
          if (serverConfig && !serverConfig.disabled) {
            try {
              await mcpManager.startServer(serverId, serverConfig);
              console.log(`Started server ${serverId} for new active configuration`);
            } catch (startError) {
              console.warn(`Error starting server ${serverId}:`, startError);
              // Continue with other servers
            }
          }
        }
        
        return c.json({ 
          success: true, 
          active: id,
          previousActive,
          servers: Object.keys(newConfig).length
        });
      } catch (error) {
        console.error('Error setting active tool configuration:', error);
        return c.json({ error: 'Failed to set active tool configuration' }, 500);
      }
    });
    
    // Server status routes with enhanced information
    workspaceRouter.get('/tools/servers/status', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        
        // Get statuses for all servers in the active configuration
        const serverStatuses: Record<string, any> = {};
        
        // Get active tool configuration
        const active = await workspace.tools.getActive();
        const activeConfig = await workspace.tools.getConfigSet(active);
        
        if (!activeConfig) {
          return c.json({ 
            error: 'No active tool configuration found',
            active
          }, 404);
        }
        
        // Check status for each server in the active config
        for (const [serverId, config] of Object.entries(activeConfig)) {
          if (!config) {
            serverStatuses[serverId] = { status: 'not_configured' };
            continue;
          }
          
          if (config.disabled) {
            serverStatuses[serverId] = { 
              status: 'disabled',
              config: {
                disabled: true
              }
            };
            continue;
          }
          
          try {
            // Get detailed server state
            const server = mcpManager.getServer(serverId);
            const serverState = server ? mcpManager.getServerState(serverId) : null;
            
            if (serverState && server) {
              // If server is running, include health information
              let healthStatus;
              try {
                healthStatus = await server.checkHealth();
              } catch (healthError) {
                healthStatus = false;
              }
              
              serverStatuses[serverId] = {
                status: 'running',
                health: {
                  isHealthy: healthStatus,
                  lastCheck: new Date().toISOString(),
                  metrics: serverState.health || {}
                },
                config: {},
                logs: serverState.logs?.slice(-3) || []
              };
            } else {
              serverStatuses[serverId] = {
                status: 'stopped',
                config: {}
              };
            }
          } catch (error) {
            // Server probably doesn't exist
            serverStatuses[serverId] = {
              status: 'stopped',
              config: {}
            };
          }
        }
        
        return c.json({
          active,
          servers: serverStatuses,
          serverCount: Object.keys(serverStatuses).length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting server status:', error);
        return c.json({ 
          error: 'Failed to get server status',
          message: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    });
    
    // Get detailed status for a specific server
    workspaceRouter.get('/tools/servers/status/:serverId', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const serverId = c.req.param('serverId');
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        
        // Get active configuration to check if this server is included
        const active = await workspace.tools.getActive();
        const activeConfig = await workspace.tools.getConfigSet(active);
        const serverConfig = activeConfig?.[serverId];
        
        // Try to get server state
        try {
          const server = mcpManager.getServer(serverId);
          
          if (server) {
            const serverState = mcpManager.getServerState(serverId);
            
            // Check server health
            let healthStatus;
            try {
              healthStatus = await server.checkHealth();
            } catch (healthError) {
              healthStatus = false;
            }
            
            // Return enhanced server information
            if (serverState) {
              return c.json({
                id: serverId,
                status: 'running',
                health: {
                  isHealthy: healthStatus,
                  lastCheck: new Date().toISOString(),
                  metrics: serverState.health || {}
                },
                config: serverConfig || { type: 'unknown' },
                logs: serverState.logs?.slice(-10) || [],
                state: {
                  retryCount: serverState.retryCount,
                  lastError: serverState.error
                },
                active: serverConfig ? true : false
              });
            }
          } else {
            // Server doesn't exist but is in configuration
            return c.json({
              id: serverId,
              status: 'stopped',
              config: serverConfig || null,
              active: serverConfig ? true : false
            });
          }
        } catch (error) {
          // Server doesn't exist
          return c.json({
            id: serverId,
            status: 'stopped',
            config: serverConfig || null,
            active: serverConfig ? true : false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } catch (error) {
        console.error(`Error getting status for server:`, error);
        return c.json({
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    });
    
    // Restart a specific server
    workspaceRouter.post('/tools/servers/:serverId/restart', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const serverId = c.req.param('serverId');
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        
        // First check if this server is in the active configuration
        const active = await workspace.tools.getActive();
        const activeConfig = await workspace.tools.getConfigSet(active);
        const serverConfig = activeConfig?.[serverId];
        
        if (!serverConfig) {
          return c.json({
            error: `Server ${serverId} not found in active configuration`,
            active
          }, 404);
        }
        
        if (serverConfig.disabled) {
          return c.json({
            error: `Server ${serverId} is disabled in the configuration`,
            active
          }, 400);
        }
        
        try {
          // First try to restart the server
          await mcpManager.restartServer(serverId);
          
          // Return success response
          return c.json({
            success: true,
            id: serverId,
            message: `Server ${serverId} has been restarted`
          });
        } catch (restartError) {
          // If restart fails (maybe server wasn't running), try to start it
          try {
            await mcpManager.startServer(serverId, serverConfig);
            
            return c.json({
              success: true,
              id: serverId,
              message: `Server ${serverId} has been started`,
              note: 'Server was not running previously, so it was started instead of restarted'
            });
          } catch (startError) {
            return c.json({
              error: `Failed to start or restart server ${serverId}`,
              restartError: restartError instanceof Error ? restartError.message : String(restartError),
              startError: startError instanceof Error ? startError.message : String(startError)
            }, 500);
          }
        }
      } catch (error) {
        console.error(`Error restarting server:`, error);
        return c.json({
          error: `Failed to restart server`,
          message: error instanceof Error ? error.message : String(error) 
        }, 500);
      }
    });
  } catch (error) {
    console.error('Error setting up tools routes:', error);
    workspaceRouter.get('/tools', (c) => {
      return c.json({ error: 'Tools service unavailable' }, 503);
    });
    workspaceRouter.get('/tools/*', (c) => {
      return c.json({ error: 'Tools service unavailable' }, 503);
    });
  }
  
  // Models routes
  try {
    workspaceRouter.all('/models/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
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
  } catch (error) {
    console.error('Error setting up models routes:', error);
    workspaceRouter.get('/models', (c) => {
      return c.json({ error: 'Models service unavailable' }, 503);
    });
    workspaceRouter.get('/models/*', (c) => {
      return c.json({ error: 'Models service unavailable' }, 503);
    });
  }
  
  // Providers routes
  try {
    workspaceRouter.all('/providers/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
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
  } catch (error) {
    console.error('Error setting up providers routes:', error);
    workspaceRouter.get('/providers', (c) => {
      return c.json({ error: 'Providers service unavailable' }, 503);
    });
    workspaceRouter.get('/providers/*', (c) => {
      return c.json({ error: 'Providers service unavailable' }, 503);
    });
  }
  
  // Prompt routes
  try {
    workspaceRouter.all('/prompt/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
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
  } catch (error) {
    console.error('Error setting up prompt routes:', error);
    workspaceRouter.get('/prompt', (c) => {
      return c.json({ error: 'Prompt service unavailable' }, 503);
    });
    workspaceRouter.get('/prompt/*', (c) => {
      return c.json({ error: 'Prompt service unavailable' }, 503);
    });
  }
  
  // Files routes
  try {
    workspaceRouter.all('/files/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
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
  } catch (error) {
    console.error('Error setting up files routes:', error);
    workspaceRouter.get('/files', (c) => {
      return c.json({ error: 'Files service unavailable' }, 503);
    });
    workspaceRouter.get('/files/*', (c) => {
      return c.json({ error: 'Files service unavailable' }, 503);
    });
  }
  
  // Dynamic routes
  try {
    workspaceRouter.all('/dynamic/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
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
  } catch (error) {
    console.error('Error setting up dynamic routes:', error);
    workspaceRouter.get('/dynamic', (c) => {
      return c.json({ error: 'Dynamic context service unavailable' }, 503);
    });
    workspaceRouter.get('/dynamic/*', (c) => {
      return c.json({ error: 'Dynamic context service unavailable' }, 503);
    });
  }
  
  // Sessions routes
  try {
    workspaceRouter.post('/sessions', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        
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
    
    // Session routes - accessing SessionManager through WorkspaceManager
    workspaceRouter.all('/sessions/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        
        // Create managers and accessors with registry-backed services
        const managers = createWorkspaceManagersObject(registry, workspace, mcpManager, workspaceId);
        const accessors = createWorkspaceAccessorsObject(registry, workspaceId);
        
        // Get the sessions router for this workspace
        const sessionRouter = workspaceSessionDatabaseRoutes(
          managers, 
          accessors, 
          workspaceId, 
          workspace
        );
        
        // Create a new request with the path modified to strip the /sessions prefix
        const url = new URL(c.req.url);
        const pathParts = url.pathname.split('/');
        const sessionsIndex = pathParts.findIndex(part => part === 'sessions');
        
        if (sessionsIndex !== -1) {
          const newPathParts = pathParts.slice(sessionsIndex + 1);
          url.pathname = '/' + newPathParts.join('/');
          const newRequest = new Request(url.toString(), c.req.raw);
          return sessionRouter.fetch(newRequest, c.env);
        }
        
        return c.json({ error: 'Invalid sessions path' }, 404);
      } catch (error) {
        console.error('Error handling sessions route:', error);
        return c.json({ 
          error: 'Sessions service unavailable',
          message: error instanceof Error ? error.message : String(error)
        }, 503);
      }
    });
    
    // Streaming routes - access SessionCoordinator via registry
    workspaceRouter.all('/streaming/*', async (c) => {
      try {
        const workspaceId = (c as any).get('workspaceId') as string;
        const workspace = getWorkspaceManager(workspaceId);
        const mcpManager = getMcpManager(workspaceId);
        
        // Create managers and accessors with registry-backed services
        const managers = createWorkspaceManagersObject(registry, workspace, mcpManager, workspaceId);
        const accessors = createWorkspaceAccessorsObject(registry, workspaceId);
        
        // Set up the streaming routes with proper managers
        const streamingRouter = workspaceSessionStreamingRoutes(managers, accessors, workspaceId);
        
        // Create a new request with the path modified to strip the /streaming prefix
        const url = new URL(c.req.url);
        const pathParts = url.pathname.split('/');
        const streamingIndex = pathParts.findIndex(part => part === 'streaming');
        
        if (streamingIndex !== -1) {
          const newPathParts = pathParts.slice(streamingIndex + 1);
          url.pathname = '/' + newPathParts.join('/');
          const newRequest = new Request(url.toString(), c.req.raw);
          return streamingRouter.fetch(newRequest, c.env);
        }
        
        return c.json({ error: 'Invalid streaming path' }, 404);
      } catch (error) {
        console.error('Error handling streaming route:', error);
        return c.json({ 
          error: 'Streaming service unavailable',
          message: error instanceof Error ? error.message : String(error)
        }, 503);
      }
    });
  } catch (error) {
    console.error('Error setting up session/streaming routes:', error);
    workspaceRouter.get('/sessions', (c) => {
      return c.json({ error: 'Sessions service unavailable' }, 503);
    });
    workspaceRouter.get('/sessions/*', (c) => {
      return c.json({ error: 'Sessions service unavailable' }, 503);
    });
    workspaceRouter.get('/streaming', (c) => {
      return c.json({ error: 'Streaming service unavailable' }, 503);
    });
    workspaceRouter.get('/streaming/*', (c) => {
      return c.json({ error: 'Streaming service unavailable' }, 503);
    });
  }
  
  // Service status route specific to this workspace
  workspaceRouter.get('/services/status', async (c) => {
    try {
      const workspaceId = (c as any).get('workspaceId') as string;
      
      // Get all workspace services for this workspace
      const statuses: Record<string, any> = {};
      
      // Get the service statuses map and then iterate over it
      const serviceStatusMap = await registry.getAllServiceStatuses();
      
      for (const [key, status] of serviceStatusMap.entries()) {
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
  
  // Mount the workspace router
  app.route('/:workspaceId', workspaceRouter);
  
  return app;
}