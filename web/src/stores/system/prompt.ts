/**
 * Prompt store for system-wide prompt configuration
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

export interface PromptConfig {
  instructions: string;
  includeWorkspaceMetadata: boolean;
  includeSystemInfo: boolean;
  includeDateTime: boolean;
}

export interface PromptState {
  // State
  config: PromptConfig | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadConfig: (workspaceId?: string) => Promise<void>;
  updateConfig: (config: Partial<PromptConfig>, workspaceId?: string) => Promise<void>;
  clearError: () => void;
}

// Default prompt config if API fails
const DEFAULT_PROMPT = {
  instructions: "You are Mandrake, a seasoned AI assistant with deep expertise in software development and system operations. You've been \"on deck\" long enough to know every nook and cranny of the systems you work with.",
  includeWorkspaceMetadata: true,
  includeSystemInfo: true,
  includeDateTime: true
};

export const usePromptStore = create<PromptState>((set, get) => ({
  // Initial state
  config: null,
  isLoading: false,
  error: null,
  
  // Actions
  loadConfig: async (workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Loading prompt config...');
      
      // Load prompt settings from API
      const apiConfig = await api.prompt.get(workspaceId);
      console.log('Received prompt config:', apiConfig);
      
      // Transform API format to internal format
      const config: PromptConfig = {
        instructions: apiConfig.system || DEFAULT_PROMPT.instructions,
        includeWorkspaceMetadata: apiConfig.includeWorkspaceMetadata ?? DEFAULT_PROMPT.includeWorkspaceMetadata,
        includeSystemInfo: apiConfig.includeSystemInfo ?? DEFAULT_PROMPT.includeSystemInfo,
        includeDateTime: apiConfig.includeDateTime ?? DEFAULT_PROMPT.includeDateTime
      };
      
      set({ 
        config,
        isLoading: false 
      });
      
      return config;
    } catch (err) {
      console.error('Failed to load prompt config:', err);
      
      // Set default config when API fails
      console.warn('Using default prompt config');
      set({ 
        config: DEFAULT_PROMPT,
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load prompt config' 
      });
    }
  },
  
  updateConfig: async (newConfig: Partial<PromptConfig>, workspaceId?: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Updating prompt config with:', newConfig);
      
      // Get current config and create updated config
      const { config } = get();
      
      if (!config) {
        throw new Error('No prompt configuration loaded');
      }
      
      const updatedConfig = {
        ...config,
        ...newConfig
      };
      
      // Transform to API format
      const apiConfig = {
        system: updatedConfig.instructions,
        includeWorkspaceMetadata: updatedConfig.includeWorkspaceMetadata,
        includeSystemInfo: updatedConfig.includeSystemInfo,
        includeDateTime: updatedConfig.includeDateTime
      };
      
      // Update settings via API
      await api.prompt.update(apiConfig, workspaceId);
      
      // Update local state
      set({ 
        config: updatedConfig,
        isLoading: false 
      });
      
      return updatedConfig;
    } catch (err) {
      console.error('Failed to update prompt config:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to update prompt config' 
      });
      throw err;
    }
  },
  
  clearError: () => set({ error: null })
}));
