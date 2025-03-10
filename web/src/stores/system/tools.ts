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

export interface ToolsState {
  // State
  availableTools: any[];
  activeToolsId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadTools: () => Promise<void>;
  loadActiveTools: () => Promise<void>;
  setActiveTools: (id: string) => Promise<void>;
  updateToolConfig: (configId: string, config: ToolConfig) => Promise<void>;
  clearError: () => void;
}

export const useToolsStore = create<ToolsState>((set) => ({
  // Initial state
  availableTools: [],
  activeToolsId: null,
  isLoading: false,
  error: null,
  
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
  
  clearError: () => set({ error: null })
}));