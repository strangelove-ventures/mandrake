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
  loadTools: () => Promise<void>;
  loadActiveTools: () => Promise<void>;
  setActiveTools: (id: string) => Promise<void>;
  updateToolConfig: (configId: string, config: ToolConfig) => Promise<void>;
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
  loadTools: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load tools configurations from API
      const tools = await api.tools.list();
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
  
  loadActiveTools: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load active tools config from API
      const response = await api.tools.getActive();
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
  
  setActiveTools: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      // Set active tools config via API
      await api.tools.setActive(id);
      
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
  
  updateToolConfig: async (configId, config) => {
    try {
      set({ isLoading: true, error: null });
      
      // Update tool config via API
      await api.tools.update(configId, config);
      
      // Refresh tools list to get updated data
      const tools = await api.tools.list();
      
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
  
  clearError: () => set({ error: null }),
  
  /**
   * Load status for all servers
   */
  loadServerStatus: async (workspaceId?: string) => {
    try {
      // Non-blocking status update - don't set loading state
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