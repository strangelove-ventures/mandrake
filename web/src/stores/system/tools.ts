/**
 * System tools configuration store
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

// Types for tool configuration
interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  autoApprove?: string[];
  disabled?: boolean;
}

interface ToolConfig {
  [serverId: string]: ServerConfig;
}

interface ServerStatus {
  status: 'running' | 'stopped' | 'disabled' | 'error';
  state?: any;
  error?: string;
}

interface MethodInfo {
  name: string;
  description?: string;
  parameters?: any;
  returns?: any;
}

interface MethodExecutionResult {
  serverId: string;
  methodName: string;
  params: any;
  result: any;
  timestamp: number;
  error?: string;
  status: 'success' | 'error';
}

export interface ToolsState {
  // State
  availableTools: any[];
  activeToolsId: string | null;
  isLoading: boolean;
  error: string | null;
  serverStatus: Record<string, ServerStatus>;
  serverMethods: Record<string, MethodInfo[]>;
  selectedMethod: { serverId: string, methodName: string } | null;
  methodExecutionHistory: MethodExecutionResult[];
  
  // Actions
  loadTools: (workspaceId?: string) => Promise<void>;
  loadActiveTools: (workspaceId?: string) => Promise<void>;
  setActiveTools: (id: string, workspaceId?: string) => Promise<void>;
  updateToolConfig: (configId: string, config: ToolConfig, workspaceId?: string) => Promise<void>;
  addServerConfig: (configId: string, serverId: string, config: ServerConfig, workspaceId?: string) => Promise<void>;
  startServer: (serverId: string, config: ServerConfig, workspaceId?: string) => Promise<void>;
  stopServer: (serverId: string, workspaceId?: string) => Promise<void>;
  loadServerStatus: (workspaceId?: string) => Promise<Record<string, ServerStatus>>;
  loadServerMethods: (serverId: string) => Promise<void>;
  loadMethodDetails: (serverId: string, methodName: string) => Promise<void>;
  invokeMethod: (serverId: string, methodName: string, params: any) => Promise<any>;
  selectMethod: (serverId: string, methodName: string) => void;
  clearError: () => void;
}

export const useToolsStore = create<ToolsState>((set, get) => ({
  // Initial state
  availableTools: [],
  activeToolsId: null,
  isLoading: false,
  error: null,
  serverStatus: {},
  serverMethods: {},
  selectedMethod: null,
  methodExecutionHistory: [],
  
  // Actions
  loadTools: async (workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Load tools configurations from API
      console.log(`[tools] Loading tools with workspaceId:`, workspaceId || 'none');
      const tools = await api.tools.list(workspaceId);
      set({ 
        availableTools: tools,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to load tools:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load tools' 
      });
    }
  },
  
  loadActiveTools: async (workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Load active tools config from API
      console.log(`[tools] Loading active tools with workspaceId:`, workspaceId || 'none');
      const response = await api.tools.getActive(workspaceId);
      set({ 
        activeToolsId: response.id,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to load active tools:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load active tools' 
      });
    }
  },
  
  setActiveTools: async (id, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Set active tools config via API
      console.log(`[tools] Setting active tools ${id} with workspaceId:`, workspaceId || 'none');
      await api.tools.setActive(id, workspaceId);
      
      // Update local state
      set({ 
        activeToolsId: id,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to set active tools:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to set active tools' 
      });
    }
  },
  
  updateToolConfig: async (configId, config, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Update tool config via API
      console.log(`[tools] Updating tool config ${configId} with workspaceId:`, workspaceId || 'none');
      await api.tools.update(configId, config, workspaceId);
      
      // Refresh tools list to get updated data
      const tools = await api.tools.list(workspaceId);
      
      // Update local state
      set({ 
        availableTools: tools,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to update tool config:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to update tool config' 
      });
      throw err; // Re-throw to allow caller to handle error
    }
  },
  
  // Add a new method to specifically handle adding a server to a config
  addServerConfig: async (configId, serverId, serverConfig, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log(`[tools] Adding server ${serverId} to config ${configId} with workspaceId:`, workspaceId || 'none');
      console.log(`[tools] Server config:`, JSON.stringify(serverConfig, null, 2));
      
      // First get the current config
      let currentConfig;
      try {
        console.log(`[tools] Fetching current config for ${configId}`);
        currentConfig = await api.tools.get(configId, workspaceId);
        console.log(`[tools] Current config retrieved:`, currentConfig);
      } catch (error) {
        console.error(`Failed to get current config ${configId}:`, error);
        throw new Error(`Could not retrieve current configuration for ${configId}`);
      }
      
      // Add the new server to the config
      const updatedConfig = {
        ...currentConfig,
        [serverId]: serverConfig
      };
      
      console.log(`[tools] Updating config with new server:`, JSON.stringify(updatedConfig, null, 2));
      
      // Update the config with the new server
      try {
        await api.tools.update(configId, updatedConfig, workspaceId);
        console.log(`[tools] Config successfully updated with new server`);
      } catch (error) {
        console.error(`Failed to update config with new server:`, error);
        throw new Error(`Could not update configuration with new server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Refresh tools list
      console.log(`[tools] Refreshing tools list`);
      const tools = await api.tools.list(workspaceId);
      
      // Update local state
      set({ 
        availableTools: tools,
        isLoading: false 
      });
      
      // After adding the server to the config, try to start the server automatically
      try {
        console.log(`[tools] Automatically starting the new server ${serverId}...`);
        await get().startServer(serverId, serverConfig, workspaceId);
        console.log(`[tools] Successfully started server ${serverId} after adding it to config`);
      } catch (startError) {
        console.error(`Warning: Failed to auto-start server ${serverId} after adding to config:`, startError);
        // Don't throw this error since the config was successfully updated
      }
      
      console.log(`[tools] Server ${serverId} successfully added to config ${configId}`);
      return true;
    } catch (err) {
      console.error(`Failed to add server ${serverId} to config ${configId}:`, err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : `Failed to add server ${serverId}` 
      });
      throw err;
    }
  },
  
  /**
   * Start a server
   */
  startServer: async (serverId, config, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log(`[tools] Starting server ${serverId}...`);
      
      // Call API to start the server
      await api.tools.startServer(serverId, config, workspaceId);
      
      // Refresh server status to get updated state
      const status = await api.tools.getServersStatus(workspaceId);
      set({ serverStatus: status });
      
      set({ isLoading: false });
      console.log(`[tools] Server ${serverId} started successfully`);
    } catch (err) {
      console.error(`Failed to start server ${serverId}:`, err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : `Failed to start server ${serverId}` 
      });
      throw err;
    }
  },
  
  /**
   * Stop a server
   */
  stopServer: async (serverId, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log(`[tools] Stopping server ${serverId}...`);
      
      // Call API to stop the server
      await api.tools.stopServer(serverId, workspaceId);
      
      // Refresh server status to get updated state
      const status = await api.tools.getServersStatus(workspaceId);
      set({ serverStatus: status });
      
      set({ isLoading: false });
      console.log(`[tools] Server ${serverId} stopped successfully`);
    } catch (err) {
      console.error(`Failed to stop server ${serverId}:`, err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : `Failed to stop server ${serverId}` 
      });
      throw err;
    }
  },
  
  clearError: () => set({ error: null }),
  
  /**
   * Load status for all servers
   */
  loadServerStatus: async (workspaceId?: string) => {
    try {
      // Non-blocking status update - don't set loading state
      console.log(`[tools] Loading server status with workspaceId:`, workspaceId || 'none');
      const status = await api.tools.getServersStatus(workspaceId);
      set({ serverStatus: status });
      return status;
    } catch (err) {
      console.error('Failed to load server status:', err);
      // Don't set error state since this is a background operation
      return {};
    }
  },
  
  /**
   * Load methods for a specific server
   */
  loadServerMethods: async (serverId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const methods = await api.tools.getServerMethods(serverId);
      set(state => ({
        serverMethods: {
          ...state.serverMethods,
          [serverId]: methods
        },
        isLoading: false
      }));
    } catch (err) {
      console.error(`Failed to load methods for server ${serverId}:`, err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : `Failed to load methods for server ${serverId}` 
      });
    }
  },
  
  /**
   * Load details for a specific method
   */
  loadMethodDetails: async (serverId: string, methodName: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const methodDetails = await api.tools.getMethodDetails(serverId, methodName);
      
      // Update the method details in the serverMethods object
      set(state => {
        const serverMethodsCopy = { ...state.serverMethods };
        const methodsForServer = serverMethodsCopy[serverId] || [];
        
        // Find and update the method in the array
        const updatedMethods = methodsForServer.map(method => 
          method.name === methodName ? { ...method, ...methodDetails } : method
        );
        
        return {
          serverMethods: {
            ...serverMethodsCopy,
            [serverId]: updatedMethods
          },
          isLoading: false
        };
      });
      
      // Also set this as the selected method
      set({
        selectedMethod: { serverId, methodName }
      });
      
    } catch (err) {
      console.error(`Failed to load details for method ${methodName}:`, err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : `Failed to load details for method ${methodName}` 
      });
    }
  },
  
  /**
   * Invoke a method on a server
   */
  invokeMethod: async (serverId: string, methodName: string, params: any) => {
    try {
      set({ isLoading: true, error: null });
      
      const result = await api.tools.invokeMethod(serverId, methodName, params);
      
      // Add to execution history
      const executionResult: MethodExecutionResult = {
        serverId,
        methodName,
        params,
        result,
        timestamp: Date.now(),
        status: 'success'
      };
      
      set(state => ({
        methodExecutionHistory: [executionResult, ...state.methodExecutionHistory].slice(0, 20), // Keep last 20 executions
        isLoading: false
      }));
      
      return result;
    } catch (err) {
      console.error(`Failed to invoke method ${methodName}:`, err);
      
      // Add failed execution to history
      const errorMessage = err instanceof Error ? err.message : `Failed to invoke method ${methodName}`;
      const executionResult: MethodExecutionResult = {
        serverId,
        methodName,
        params,
        result: null,
        timestamp: Date.now(),
        error: errorMessage,
        status: 'error'
      };
      
      set(state => ({
        methodExecutionHistory: [executionResult, ...state.methodExecutionHistory].slice(0, 20),
        isLoading: false,
        error: errorMessage
      }));
      
      throw err;
    }
  },
  
  /**
   * Select a method for details view
   */
  selectMethod: (serverId: string, methodName: string) => {
    // Just set the selected method without loading details automatically
    set({ selectedMethod: { serverId, methodName } });
    
    // NOTE: Automatic loading of method details has been removed
    // Call loadMethodDetails manually if needed
  }
}));