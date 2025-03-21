import { Hono } from 'hono';
import { ToolsManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';

/**
 * Create routes for tool configuration management (using ToolsManager)
 * These routes handle storage and retrieval of tool configurations
 */
export function toolsConfigRoutes(toolsManager: ToolsManager) {
  const app = new Hono();
  
  // List all tool configurations
  app.get('/', async (c) => {
    try {
      const configSets = await toolsManager.listConfigSets();
      return c.json(configSets);
    } catch (error) {
      console.error('Error listing tool configurations:', error);
      return c.json({ error: 'Failed to list tool configurations' }, 500);
    }
  });
  
  // Get active tool configuration - IMPORTANT: This must come before /:toolId route to avoid conflicts
  app.get('/active', async (c) => {
    try {
      const active = await toolsManager.getActive();
      return c.json({ active });
    } catch (error) {
      console.error('Error getting active tool configuration:', error);
      return c.json({ error: 'Failed to get active tool configuration' }, 500);
    }
  });
  
  // Set active tool configuration - IMPORTANT: This must come before /:toolId route to avoid conflicts
  app.put('/active', async (c) => {
    try {
      const { id } = await c.req.json();
      if (!id) {
        return c.json({ error: 'Tool configuration ID is required' }, 400);
      }
      await toolsManager.setActive(id);
      return c.json({ success: true, id });
    } catch (error) {
      console.error('Error setting active tool configuration:', error);
      return c.json({ error: 'Failed to set active tool configuration' }, 500);
    }
  });
  
  // Get a specific tool configuration
  app.get('/:toolId', async (c) => {
    const toolId = c.req.param('toolId');
    try {
      const configSet = await toolsManager.getConfigSet(toolId);
      if (!configSet) {
        return c.json({ error: 'Tool configuration not found' }, 404);
      }
      return c.json(configSet);
    } catch (error) {
      console.error(`Error getting tool configuration ${toolId}:`, error);
      return c.json({ error: `Failed to get tool configuration ${toolId}` }, 500);
    }
  });
  
  // Create a new tool configuration
  app.post('/', async (c) => {
    try {
      const config = await c.req.json();
      if (!config.id) {
        return c.json({ error: 'Tool ID is required' }, 400);
      }
      
      // Extract the ID from the config and pass the rest as the config object
      const { id, ...toolConfig } = config;
      await toolsManager.addConfigSet(id, toolConfig);
      return c.json({ success: true, id }, 201);
    } catch (error) {
      console.error('Error creating tool configuration:', error);
      return c.json({ error: 'Failed to create tool configuration' }, 500);
    }
  });
  
  // Update an existing tool configuration
  app.put('/:toolId', async (c) => {
    const toolId = c.req.param('toolId');
    try {
      const config = await c.req.json();
      await toolsManager.updateConfigSet(toolId, config);
      return c.json({ success: true, id: toolId });
    } catch (error) {
      console.error(`Error updating tool configuration ${toolId}:`, error);
      return c.json({ error: `Failed to update tool configuration ${toolId}` }, 500);
    }
  });
  
  // Delete a tool configuration
  app.delete('/:toolId', async (c) => {
    const toolId = c.req.param('toolId');
    try {
      await toolsManager.removeConfigSet(toolId);
      return c.json({ success: true, id: toolId });
    } catch (error) {
      console.error(`Error deleting tool configuration ${toolId}:`, error);
      return c.json({ error: `Failed to delete tool configuration ${toolId}` }, 500);
    }
  });
  
  return app;
}

/**
 * Create routes for MCP server management (using MCPManager and ToolsManager)
 * These routes handle server lifecycle and running servers
 */
export function serverRoutes(mcpManager: MCPManager, toolsManager?: ToolsManager) {
  const app = new Hono();
  
  // Get status for all servers
  app.get('/status', async (c) => {
    try {
      const serverStatuses = {};
      
      // If we have a ToolsManager, use it to get active configuration
      if (toolsManager) {
        try {
          const active = await toolsManager.getActive();
          const activeConfig = await toolsManager.getConfigSet(active);
          
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
        } catch (error) {
          console.error('Error getting active tool configuration:', error);
          return c.json({ error: 'Failed to get server status' }, 500);
        }
      } else {
        // Without ToolsManager, just list running servers from MCPManager directly
        // This is less complete but still provides some information
        // In a real implementation, you might want to iterate through all known servers
      }
      
      return c.json(serverStatuses);
    } catch (error) {
      console.error('Error getting server status:', error);
      return c.json({ error: 'Failed to get server status' }, 500);
    }
  });
  
  // Get enhanced status for a specific server
  app.get('/status/:serverId', async (c) => {
    const serverId = c.req.param('serverId');
    try {
      const serverState = mcpManager.getServerState(serverId);
      if (!serverState) {
        return c.json({ status: 'stopped' });
      }
      
      // Enhanced status response with more details
      return c.json({
        id: serverId,
        status: serverState.status || 'unknown',
        error: serverState.error,
        retryCount: serverState.retryCount,
        lastRetryTimestamp: serverState.lastRetryTimestamp,
        logTail: serverState.logs.slice(-10), // Last 10 log lines
        health: serverState.health || null, // Health metrics if available
        proxy: serverState.proxy || null // Proxy state if available
      });
    } catch (error) {
      console.error(`Error getting status for server ${serverId}:`, error);
      return c.json({ 
        status: 'error',
        error: error instanceof Error ? error.message : String(error) 
      }, 500);
    }
  });
  
  // Get detailed logs for a server
  app.get('/:serverId/logs', async (c) => {
    const serverId = c.req.param('serverId');
    const limit = parseInt(c.req.query('limit') || '100');
    
    try {
      const serverState = mcpManager.getServerState(serverId);
      
      if (!serverState) {
        return c.json({ 
          error: `Server ${serverId} not found or not running`,
          status: 'not_found'
        }, 404);
      }
      
      return c.json({
        id: serverId,
        logs: serverState.logs.slice(-limit),
        totalLogs: serverState.logs.length
      });
    } catch (error) {
      console.error(`Error getting logs for server ${serverId}:`, error);
      return c.json({ 
        error: error instanceof Error ? error.message : String(error),
        status: 'error'
      }, 500);
    }
  });
  
  // Get health metrics for a server
  app.get('/:serverId/health', async (c) => {
    const serverId = c.req.param('serverId');
    
    try {
      const server = mcpManager.getServer(serverId);
      
      if (!server) {
        return c.json({ 
          error: `Server ${serverId} not found`,
          status: 'not_found'
        }, 404);
      }
      
      // Get current server state to access health metrics
      const state = server.getState();
      
      // Trigger an immediate health check
      let isCurrentlyHealthy;
      try {
        isCurrentlyHealthy = await server.checkHealth();
      } catch (healthError) {
        isCurrentlyHealthy = false;
      }
      
      return c.json({
        id: serverId,
        status: state.status || 'unknown',
        isHealthy: isCurrentlyHealthy,
        healthMetrics: state.health || null,
        lastError: state.error || null
      });
    } catch (error) {
      console.error(`Error getting health metrics for server ${serverId}:`, error);
      return c.json({ 
        error: error instanceof Error ? error.message : String(error),
        status: 'error'
      }, 500);
    }
  });
  
  // Restart a server
  app.post('/:serverId/restart', async (c) => {
    const serverId = c.req.param('serverId');
    
    try {
      // Check if the server exists
      const server = mcpManager.getServer(serverId);
      
      if (!server) {
        return c.json({ 
          error: `Server ${serverId} not found`,
          status: 'not_found'
        }, 404);
      }
      
      try {
        // Use the MCPManager's restartServer method
        await mcpManager.restartServer(serverId);
        
        // Get updated state after restart
        const updatedState = mcpManager.getServerState(serverId);
        
        return c.json({
          id: serverId,
          message: `Server ${serverId} restarted successfully`,
          status: updatedState?.status || 'unknown'
        });
      } catch (restartError) {
        console.error(`Error restarting server ${serverId}:`, restartError);
        return c.json({ 
          error: restartError instanceof Error ? restartError.message : String(restartError),
          status: 'restart_failed'
        }, 500);
      }
    } catch (error) {
      console.error(`Error handling restart for server ${serverId}:`, error);
      return c.json({ 
        error: error instanceof Error ? error.message : String(error),
        status: 'error'
      }, 500);
    }
  });
  
  // List all servers (configurations and running status)
  app.get('/', async (c) => {
    try {
      // If we have a ToolsManager, we can use it to list available configurations
      if (toolsManager) {
        const configs = await toolsManager.listConfigSets();
        const serverInfo = Object.entries(configs).map(([id, config]) => {
          // Attempt to determine if server is running (basic approximation)
          let status = "unknown";
          try {
            // This is a non-blocking way to check if a server exists (will throw if not found)
            mcpManager.getServer(id);
            status = "running";
          } catch {
            status = "stopped";
          }
          
          return {
            id,
            status,
            config
          };
        });
        return c.json(serverInfo);
      }
      
      // Otherwise, we can't effectively list servers from MCPManager alone
      return c.json([]);
    } catch (error) {
      console.error('Error listing servers:', error);
      return c.json({ error: 'Failed to list servers' }, 500);
    }
  });
  
  // Start a server with configuration
  app.post('/', async (c) => {
    try {
      const { type, config } = await c.req.json();
      if (!type || !config) {
        return c.json({ error: 'Server type and configuration are required' }, 400);
      }
      const serverId = await mcpManager.startServer(type, config);
      return c.json({ success: true, id: serverId }, 201);
    } catch (error) {
      console.error('Error starting server:', error);
      return c.json({ error: 'Failed to start server' }, 500);
    }
  });
  
  // Stop a running server
  app.delete('/:serverId', async (c) => {
    const serverId = c.req.param('serverId');
    try {
      await mcpManager.stopServer(serverId);
      return c.json({ success: true, id: serverId });
    } catch (error) {
      console.error(`Error stopping server ${serverId}:`, error);
      return c.json({ error: `Failed to stop server ${serverId}` }, 500);
    }
  });
  
  return app;
}

/**
 * Create routes for tool operations (using MCPManager)
 * These routes handle tool discovery and invocation
 */
export function toolsOperationRoutes(mcpManager: MCPManager) {
  const app = new Hono();
  
  // Get enhanced details for a specific method from a server
  app.get('/server/:serverId/method/:methodName', async (c) => {
    const serverId = c.req.param('serverId');
    const methodName = c.req.param('methodName');
    try {
      const server = mcpManager.getServer(serverId);
      if (!server) {
        return c.json({ 
          error: `Server ${serverId} not found`,
          status: 'server_not_found'
        }, 404);
      }
      
      // Get server state to check status
      const state = server.getState();
      if (state.error) {
        console.warn(`Server ${serverId} has errors when getting method details: ${state.error}`);
      }
      
      try {
        const tools = await server.listTools();
        const method = tools.find(tool => tool.name === methodName);
        
        if (!method) {
          return c.json({ 
            error: `Method ${methodName} not found on server ${serverId}`,
            status: 'method_not_found'
          }, 404);
        }
        
        // Enhanced response with more details and better formatting
        return c.json({
          name: method.name,
          description: method.description,
          parameters: method.parameters,
          returns: method.returns,
          examples: method.examples || [],
          serverName: serverId,
          serverStatus: state.status || 'unknown',
          // Add support for detecting if completions are available
          supportsCompletions: true // Assume support - server handles graceful fallback
        });
      } catch (toolsError) {
        // Specific error for tool listing failure
        console.error(`Error getting tools list for method details ${serverId}:`, toolsError);
        return c.json({ 
          error: toolsError instanceof Error ? toolsError.message : String(toolsError),
          status: 'tools_error',
          serverRunning: true,
          logs: state.logs?.slice(-5) || [] // Include some logs for debugging
        }, 500);
      }
    } catch (error) {
      console.error(`Error getting method ${methodName} from server ${serverId}:`, error);
      return c.json({ 
        error: error instanceof Error ? error.message : String(error),
        status: 'general_error'
      }, 500);
    }
  });
  
  // List all available tools from all servers
  app.get('/', async (c) => {
    try {
      const tools = await mcpManager.listAllTools();
      return c.json(tools);
    } catch (error) {
      console.error('Error listing tools:', error);
      return c.json({ error: 'Failed to list tools' }, 500);
    }
  });
  
  // List tools from a specific server
  app.get('/server/:serverId', async (c) => {
    const serverId = c.req.param('serverId');
    try {
      // First, verify the server exists
      const server = await mcpManager.getServer(serverId);
      if (!server) {
        console.error(`Server ${serverId} not found when trying to list tools`);
        return c.json({ 
          error: `Server ${serverId} not found`,
          status: 'not_found'
        }, 404);
      }
      
      // Get the server state to check if it's running properly
      const state = server.getState();
      if (state.error) {
        console.warn(`Server ${serverId} has errors: ${state.error}`);
      }
      
      try {
        // Try to list tools, but handle errors specifically
        console.log(`Listing tools for server ${serverId}...`);
        const tools = await server.listTools();
        
        // If we got no tools, indicate this in the response
        if (!tools || tools.length === 0) {
          console.warn(`No tools found for server ${serverId}`);
          return c.json({ 
            tools: [],
            warning: 'No tools available for this server',
            status: 'empty'
          });
        }
        
        return c.json(tools);
      } catch (toolsError) {
        // Specific error for tool listing failure
        console.error(`Error listing tools for server ${serverId}:`, toolsError);
        return c.json({ 
          error: toolsError instanceof Error ? toolsError.message : String(toolsError),
          status: 'tools_error',
          serverRunning: true,
          logs: state.logs?.slice(-10) || []
        }, 500);
      }
    } catch (error) {
      // General error for server access issues
      console.error(`General error with server ${serverId}:`, error);
      return c.json({ 
        error: error instanceof Error ? error.message : String(error),
        status: 'server_error'
      }, 500);
    }
  });
  
  // Invoke a tool
  app.post('/invoke', async (c) => {
    try {
      const { serverId, toolName, params } = await c.req.json();
      if (!serverId || !toolName) {
        return c.json({ error: 'Server ID and tool name are required' }, 400);
      }
      const result = await mcpManager.invokeTool(serverId, toolName, params || {});
      return c.json(result);
    } catch (error) {
      console.error('Error invoking tool:', error);
      return c.json({ 
        error: error instanceof Error ? error.message : 'Failed to invoke tool',
        status: 'invoke_failed'
      }, 500);
    }
  });
  
  // Get completions for a tool argument
  app.post('/complete', async (c) => {
    try {
      const { serverId, methodName, argName, value } = await c.req.json();
      
      // Validate required fields
      if (!serverId || !methodName || !argName) {
        return c.json({ 
          error: 'Missing required fields. serverId, methodName, and argName are required',
          status: 'invalid_request' 
        }, 400);
      }
      
      // Normalize value to empty string if not provided
      const normalizedValue = value || '';
      
      try {
        // Get completions from the MCP manager
        const completions = await mcpManager.getCompletions(
          serverId,
          methodName,
          argName,
          normalizedValue
        );
        
        return c.json({
          completions: {
            values: completions,
            count: completions.length
          },
          request: {
            serverId,
            methodName,
            argName,
            value: normalizedValue
          }
        });
      } catch (completionsError) {
        // If the error is that the tool wasn't found, or the server doesn't support completions,
        // return an empty array instead of an error
        if (completionsError instanceof Error) {
          const errorMessage = completionsError.message.toLowerCase();
          if (errorMessage.includes('not found') || 
              errorMessage.includes('not supported') || 
              errorMessage.includes('method not found')) {
            console.log(`Completions not available for ${methodName}.${argName} on server ${serverId}`);
            return c.json({
              completions: {
                values: [],
                count: 0
              },
              request: {
                serverId,
                methodName,
                argName,
                value: normalizedValue
              },
              message: 'Completions not supported for this tool'
            });
          }
        }
        
        // For other errors, return proper error response
        console.error('Error getting completions:', completionsError);
        return c.json({ 
          error: completionsError instanceof Error ? completionsError.message : String(completionsError),
          status: 'completions_error',
          request: {
            serverId,
            methodName,
            argName,
            value: normalizedValue
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error processing completions request:', error);
      return c.json({ 
        error: error instanceof Error ? error.message : String(error),
        status: 'general_error'
      }, 500);
    }
  });
  
  return app;
}

/**
 * Create a function to mount all tool-related routes under a single parent
 * This provides a convenient way to set up all tool routes at once
 */
export function allToolRoutes(toolsManager: ToolsManager, mcpManager: MCPManager) {
  const app = new Hono();
  
  // Mount tool configuration routes
  app.route('/configs', toolsConfigRoutes(toolsManager));
  
  // Mount server management routes (pass both managers for enhanced functionality)
  app.route('/servers', serverRoutes(mcpManager, toolsManager));
  
  // Mount tool operation routes
  app.route('/operations', toolsOperationRoutes(mcpManager));
  
  return app;
}