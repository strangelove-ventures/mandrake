/**
 * System models configuration store
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ModelsState {
  // State
  availableModels: any[];
  activeModelId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadModels: () => Promise<void>;
  loadActiveModel: () => Promise<void>;
  setActiveModel: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useModelsStore = create<ModelsState>((set) => ({
  // Initial state
  availableModels: [],
  activeModelId: null,
  isLoading: false,
  error: null,
  
  // Actions
  loadModels: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load models from API
      const models = await api.models.list();
      set({ 
        availableModels: models,
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
  
  loadActiveModel: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load active model from API
      const response = await api.models.getActive();
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
  
  setActiveModel: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      // Set active model via API
      await api.models.setActive(id);
      
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
  
  clearError: () => set({ error: null })
}));
