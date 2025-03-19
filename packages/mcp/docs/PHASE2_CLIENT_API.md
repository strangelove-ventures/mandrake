# Phase 2: Client API Enhancement

This document outlines the plan for Phase 2 of the MCP Inspector integration, focusing on enhancing the client API layer.

## Current State

Our current client API implementation has:

1. Basic endpoints for managing MCP servers and tools
2. Simple error handling
3. Limited status reporting
4. No support for advanced features like completions

## Target State

Enhance the client API with:

1. More robust error handling
2. Better status reporting
3. Support for completions
4. Improved session management
5. Enhanced authentication support

## Implementation Plan

### 1. API Endpoint Enhancements

#### Current Endpoints

The current API endpoints include:

- `/tools/configs` - List tool configurations
- `/tools/configs/active` - Get/set active configuration
- `/tools/servers` - Start/stop servers
- `/tools/servers/status` - Get server status
- `/tools/operations` - List and invoke tools

#### Enhanced Endpoints

We will enhance existing endpoints and add new ones:

1. **Server Management Endpoints**

   ```typescript
   // API Routes to add or enhance
   
   // Enhanced server status endpoint
   // GET /system/tools/servers/status/:id
   async function getServerStatus(c: Context) {
     const id = c.req.param('id');
     
     try {
       const manager = c.get('mcpManager') as MCPManager;
       const state = manager.getServerState(id);
       
       if (!state) {
         return c.json({ error: `Server ${id} not found` }, 404);
       }
       
       // Enhanced status response with more details
       return c.json({
         id,
         status: state.status || 'unknown',
         error: state.error,
         retryCount: state.retryCount,
         lastRetryTimestamp: state.lastRetryTimestamp,
         logTail: state.logs.slice(-10) // Last 10 log lines
       });
     } catch (error) {
       return c.json({ 
         error: error instanceof Error ? error.message : 'Unknown error'
       }, 500);
     }
   }
   
   // New detailed logs endpoint
   // GET /system/tools/servers/:id/logs
   async function getServerLogs(c: Context) {
     const id = c.req.param('id');
     const limit = parseInt(c.req.query('limit') || '100');
     
     try {
       const manager = c.get('mcpManager') as MCPManager;
       const state = manager.getServerState(id);
       
       if (!state) {
         return c.json({ error: `Server ${id} not found` }, 404);
       }
       
       return c.json({
         id,
         logs: state.logs.slice(-limit)
       });
     } catch (error) {
       return c.json({ 
         error: error instanceof Error ? error.message : 'Unknown error'
       }, 500);
     }
   }
   
   // New restart endpoint
   // POST /system/tools/servers/:id/restart
   async function restartServer(c: Context) {
     const id = c.req.param('id');
     
     try {
       const manager = c.get('mcpManager') as MCPManager;
       const server = manager.getServer(id);
       
       if (!server) {
         return c.json({ error: `Server ${id} not found` }, 404);
       }
       
       const config = server.getConfig();
       
       // Stop and start the server
       await manager.stopServer(id);
       await manager.startServer(id, config);
       
       return c.json({
         message: `Server ${id} restarted successfully`
       });
     } catch (error) {
       return c.json({ 
         error: error instanceof Error ? error.message : 'Unknown error'
       }, 500);
     }
   }
   ```

2. **Enhanced Tool Operations Endpoints**

   ```typescript
   // Enhanced method details endpoint
   // GET /system/tools/operations/server/:serverId/method/:methodName
   async function getMethodDetails(c: Context) {
     const serverId = c.req.param('serverId');
     const methodName = c.req.param('methodName');
     
     try {
       const manager = c.get('mcpManager') as MCPManager;
       const server = manager.getServer(serverId);
       
       if (!server) {
         return c.json({ error: `Server ${serverId} not found` }, 404);
       }
       
       // Get all tools
       const tools = await server.listTools();
       const tool = tools.find(t => t.name === methodName);
       
       if (!tool) {
         return c.json({ error: `Method ${methodName} not found` }, 404);
       }
       
       // Enhanced response with more details
       return c.json({
         name: tool.name,
         description: tool.description,
         parameters: tool.parameters,
         returns: tool.returns,
         examples: tool.examples || [],
         // Add any additional metadata
       });
     } catch (error) {
       return c.json({ 
         error: error instanceof Error ? error.message : 'Unknown error'
       }, 500);
     }
   }
   
   // New completions endpoint
   // POST /system/tools/operations/complete
   async function getCompletions(c: Context) {
     try {
       const body = await c.req.json();
       const { serverId, methodName, argName, value } = body;
       
       if (!serverId || !methodName || !argName) {
         return c.json({ error: 'Missing required fields' }, 400);
       }
       
       const manager = c.get('mcpManager') as MCPManager;
       const server = manager.getServer(serverId);
       
       if (!server) {
         return c.json({ error: `Server ${serverId} not found` }, 404);
       }
       
       // This would require adding a completion method to the MCPServerImpl
       // Will be implemented in the server class
       const completions = await server.getCompletions(methodName, argName, value);
       
       return c.json({
         completions
       });
     } catch (error) {
       return c.json({ 
         error: error instanceof Error ? error.message : 'Unknown error'
       }, 500);
     }
   }
   ```

### 2. Enhanced Types

We need to enhance our type definitions to support the new functionality:

```typescript
// packages/utils/src/types/mcp/tools.ts

/**
 * Completion request parameters
 */
export interface CompletionParams {
  ref: {
    type: 'resource' | 'prompt';
    id: string;
  };
  argument: {
    name: string;
    value: string;
  };
}

/**
 * Completion result
 */
export interface CompletionResult {
  completion: {
    values: string[];
  };
}

/**
 * Extended tool interface with completions support
 */
export interface MCPToolWithCompletions extends Tool {
  serverName: string;
  supportsCompletions?: boolean;
}
```

### 3. React Hooks Implementation

To enhance the client-side experience, we'll implement React hooks based on the Inspector's hooks:

#### useConnection Hook

```typescript
// web/src/hooks/useMCPConnection.ts
import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ServerStatus, Tool } from '@mandrake/utils';

interface UseMCPConnectionOptions {
  serverId: string;
  autoConnect?: boolean;
  pollingInterval?: number;
  onStatusChange?: (status: ServerStatus) => void;
}

export function useMCPConnection({
  serverId,
  autoConnect = true,
  pollingInterval = 5000,
  onStatusChange
}: UseMCPConnectionOptions) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<NodeJS.Timeout | null>(null);
  
  // Fetch server status
  const fetchStatus = useCallback(async () => {
    try {
      const serverStatus = await api.tools.getServerStatus(serverId);
      setStatus(serverStatus);
      
      if (onStatusChange) {
        onStatusChange(serverStatus);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server status');
      console.error('Error fetching server status:', err);
    }
  }, [serverId, onStatusChange]);
  
  // Fetch tools
  const fetchTools = useCallback(async () => {
    try {
      setIsLoading(true);
      const serverTools = await api.tools.getServerMethods(serverId);
      setTools(serverTools);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools');
      console.error('Error fetching tools:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);
  
  // Start server
  const startServer = useCallback(async () => {
    try {
      setIsLoading(true);
      // This assumes you have the config available
      // You would need to get this from your store or props
      const config = {}; // Replace with actual config
      
      await api.tools.startServer(serverId, config);
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server');
      console.error('Error starting server:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serverId, fetchStatus]);
  
  // Stop server
  const stopServer = useCallback(async () => {
    try {
      setIsLoading(true);
      await api.tools.stopServer(serverId);
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop server');
      console.error('Error stopping server:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serverId, fetchStatus]);
  
  // Restart server
  const restartServer = useCallback(async () => {
    try {
      setIsLoading(true);
      // This would use the new restart endpoint
      await api.tools.restartServer(serverId);
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
      console.error('Error restarting server:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serverId, fetchStatus]);
  
  // Start polling
  const startPolling = useCallback(() => {
    if (pollingId) {
      clearInterval(pollingId);
    }
    
    const id = setInterval(() => {
      fetchStatus();
    }, pollingInterval);
    
    setPollingId(id);
    
    return () => {
      if (id) clearInterval(id);
    };
  }, [fetchStatus, pollingInterval, pollingId]);
  
  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingId) {
      clearInterval(pollingId);
      setPollingId(null);
    }
  }, [pollingId]);
  
  // Initialize
  useEffect(() => {
    if (autoConnect) {
      fetchStatus();
      fetchTools();
      startPolling();
    }
    
    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [autoConnect, fetchStatus, fetchTools, startPolling, pollingId]);
  
  // Invoke a tool
  const invokeTool = useCallback(async (methodName: string, params: any) => {
    try {
      setIsLoading(true);
      const result = await api.tools.invokeMethod(serverId, methodName, params);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invoke tool');
      console.error('Error invoking tool:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);
  
  return {
    status,
    tools,
    selectedTool,
    isLoading,
    error,
    fetchStatus,
    fetchTools,
    startServer,
    stopServer,
    restartServer,
    startPolling,
    stopPolling,
    setSelectedTool,
    invokeTool,
    clearError: () => setError(null)
  };
}
```

#### useCompletionState Hook

```typescript
// web/src/hooks/useToolCompletions.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

// Simple debounce function
function debounce<T extends (...args: any[]) => Promise<void>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface UseToolCompletionsOptions {
  serverId: string;
  methodName: string;
  debounceMs?: number;
}

export function useToolCompletions({
  serverId,
  methodName,
  debounceMs = 300
}: UseToolCompletionsOptions) {
  const [completions, setCompletions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cleanup function for abort controller
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  // Clear completions
  const clearCompletions = useCallback(() => {
    cleanup();
    setCompletions({});
    setLoading({});
  }, [cleanup]);
  
  // Request completions with debounce
  const requestCompletions = useCallback(
    debounce(async (argName: string, value: string) => {
      cleanup();
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      setLoading(prev => ({ ...prev, [argName]: true }));
      
      try {
        // This would use the new completions endpoint
        const response = await api.tools.getCompletions({
          serverId,
          methodName,
          argName,
          value
        }, { signal: abortController.signal });
        
        if (!abortController.signal.aborted) {
          setCompletions(prev => ({
            ...prev,
            [argName]: response.completions
          }));
          setError(null);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to get completions');
          console.error('Error getting completions:', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(prev => ({ ...prev, [argName]: false }));
        }
        
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }, debounceMs),
    [serverId, methodName, debounceMs]
  );
  
  return {
    completions,
    loading,
    error,
    requestCompletions,
    clearCompletions
  };
}
```

### 4. API Client Updates

We need to update the API client to include the new endpoints:

```typescript
// web/src/lib/api/resources/tools.ts
// Add these new methods to the tools object

/**
 * Get method completions
 */
getCompletions: async (params: {
  serverId: string;
  methodName: string;
  argName: string;
  value: string;
}, options?: { signal?: AbortSignal }) => {
  const path = '/system/tools/operations/complete';
  
  return apiClient.fetchJson(path, {
    method: 'POST',
    body: params,
    signal: options?.signal
  });
},

/**
 * Restart a server
 */
restartServer: async (serverId: string, workspaceId?: string) => {
  const path = workspaceId
    ? `/workspaces/${workspaceId}/tools/servers/${serverId}/restart`
    : `/system/tools/servers/${serverId}/restart`;
    
  return apiClient.fetchJson(path, {
    method: 'POST'
  });
},

/**
 * Get server logs
 */
getServerLogs: async (serverId: string, limit?: number, workspaceId?: string) => {
  const params = limit ? `?limit=${limit}` : '';
  const path = workspaceId
    ? `/workspaces/${workspaceId}/tools/servers/${serverId}/logs${params}`
    : `/system/tools/servers/${serverId}/logs${params}`;
    
  return apiClient.fetchJson(path);
}
```

## Integration with Existing Code

### Server Implementation

To support completions, we need to add the capability to our MCPServerImpl:

```typescript
// packages/mcp/src/server.ts
// Add this method to MCPServerImpl class

// Use the SDK adapter interfaces created in Phase 1
async getCompletions(
  methodName: string,
  argName: string,
  value: string
): Promise<string[]> {
  if (this.config.disabled) {
    return [];
  }

  if (!this.client) {
    throw new Error('Server not connected');
  }

  try {
    this.logger.info('Getting completions', { methodName, argName, value });
    
    // First, get the tool to check if it exists
    const tools = await this.listTools();
    const tool = tools.find(t => t.name === methodName);
    
    if (!tool) {
      throw new Error(`Tool ${methodName} not found`);
    }
    
    // Create the completion request
    const request = {
      method: "completion/complete",
      params: {
        argument: {
          name: argName,
          value,
        },
        ref: {
          type: "resource",
          id: methodName,
        },
      },
    };
    
    try {
      // Call the completion method on the client through the adapter
      const response = await this.client.request(
        request,
        MCPSchemaAdapter.getCompleteResultSchema()
      );
      
      this.logBuffer.append(`Completions received for ${methodName}.${argName}`);
      this.logger.info('Completions received', { 
        methodName, 
        argName, 
        count: response?.completion.values.length 
      });
      
      return response?.completion.values || [];
    } catch (error) {
      // If the server doesn't support completions, return empty array
      if (error.code === "MethodNotFound") {
        this.logger.info('Completions not supported by server', { methodName });
        return [];
      }
      
      // Otherwise, propagate the error
      throw error;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.logger.error('Failed to get completions', { 
      methodName, 
      argName, 
      error: errorMsg 
    });
    this.logBuffer.append(`Error getting completions for ${methodName}.${argName}: ${errorMsg}`);
    throw new Error(errorMsg);
  }
}
```

### Manager Implementation

The manager needs to expose the completions capability, using the SDK adapters created in Phase 1:

```typescript
// packages/mcp/src/manager.ts
// Add this method to MCPManager class

async getCompletions(
  serverId: string,
  methodName: string,
  argName: string,
  value: string
): Promise<string[]> {
  const server = this.servers.get(serverId);
  if (!server) {
    throw new Error(`Server ${serverId} not found`);
  }

  this.logger.info('Getting completions', { serverId, methodName, argName });
  try {
    const completions = await server.getCompletions(methodName, argName, value);
    this.logger.info('Completions received', { 
      serverId, 
      methodName, 
      argName, 
      count: completions.length 
    });
    return completions;
  } catch (error) {
    this.logger.error('Failed to get completions', { 
      serverId, 
      methodName, 
      argName, 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}
```

## Testing Approach

For Phase 2, we'll use an integration testing approach with the following focus areas:

1. **API Endpoint Testing**
   - Integration tests for each new/updated API endpoint with real MCP servers
   - Test error handling scenarios with actual server failures
   - Test completions functionality with servers that support it

2. **React Hooks Testing**
   - Test hooks against real API responses
   - Test error handling and retry logic
   - Test completions with real server-provided suggestions

3. **Integration Testing**
   - End-to-end tests of the complete flow from UI to server
   - Performance testing to ensure responsiveness
   - Compatibility testing with different server types

## Success Criteria

1. **API Robustness**
   - All API endpoints return proper error responses
   - Server status and logs are accessible
   - Completions work for supported tools
   - Integration tests pass with real MCP servers

2. **UI Integration**
   - Tool components use the new hooks for better state management
   - Completions appear in the UI for arguments
   - Error handling provides useful feedback

3. **Performance**
   - Completion requests are properly debounced
   - Status polling doesn't cause excessive load
   - UI remains responsive during operations
   - Performance tests show acceptable response times

4. **Compatibility**
   - Works with all existing MCP server types
   - Handles servers that don't support completions gracefully
