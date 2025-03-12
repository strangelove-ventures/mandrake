/**
 * System models configuration store
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ModelsState {
  // State
  models: any[];
  activeModelId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadModels: (workspaceId?: string) => Promise<void>;
  loadActiveModel: (workspaceId?: string) => Promise<void>;
  setActiveModel: (id: string, workspaceId?: string) => Promise<void>;
  updateModel: (id: string, config: any, workspaceId?: string) => Promise<void>;
  updateProvider: (id: string, config: any, workspaceId?: string) => Promise<void>;
  clearError: () => void;
}

export const useModelsStore = create<ModelsState>((set) => ({
  // Initial state
  models: [],
  activeModelId: null,
  isLoading: false,
  error: null,
  
  // Actions
  loadModels: async (workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Load models configurations from API
      const models = await api.models.list(workspaceId);
      console.log('Store - Models API response:', models);
      set({ 
        models,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to load models:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load models' 
      });
    }
  },
  
  loadActiveModel: async (workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Load active model ID from API
      const response = await api.models.getActive(workspaceId);
      set({ 
        activeModelId: response.id,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to load active model:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load active model' 
      });
    }
  },
  
  setActiveModel: async (id, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Set active model via API
      await api.models.setActive(id, workspaceId);
      
      // Update local state
      set({ 
        activeModelId: id,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to set active model:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to set active model' 
      });
    }
  },
  
  updateModel: async (id, config, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Update model via API
      await api.models.update(id, config, workspaceId);
      
      // Refresh models list to get updated data
      const models = await api.models.list(workspaceId);
      
      // Update local state
      set({ 
        models,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to update model:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to update model' 
      });
      throw err; // Re-throw to allow caller to handle error
    }
  },
  
  updateProvider: async (id, config, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Update provider via API
      await api.models.updateProvider(id, config, workspaceId);
      
      // Refresh models list to get updated data
      const models = await api.models.list(workspaceId);
      
      // Update local state
      set({ 
        models,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to update provider:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to update provider' 
      });
      throw err; // Re-throw to allow caller to handle error
    }
  },
  
  clearError: () => set({ error: null })
}));
