/**
 * Global system store for Mandrake configuration
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface SystemSettings {
  theme: 'light' | 'dark' | 'system';
  telemetry: boolean;
  metadata: Record<string, string>;
}

export interface SystemState {
  // State
  settings: SystemSettings;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  clearError: () => void;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  // Initial state
  settings: {
    theme: 'system',
    telemetry: true,
    metadata: {},
  },
  isLoading: false,
  error: null,
  
  // Actions
  loadSettings: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('Loading system config...');
      
      // Load system settings from API
      const config = await api.system.getConfig();
      console.log('Received system config:', config);
      
      set({ 
        settings: {
          theme: config.theme || 'system',
          telemetry: config.telemetry ?? true,
          metadata: config.metadata || {}
        },
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to load system settings:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to load system settings' 
      });
    }
  },
  
  updateSettings: async (newSettings) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Updating system config with:', newSettings);
      
      // Get current settings and create updated settings
      const { settings } = get();
      const updatedSettings = {
        ...settings,
        ...newSettings
      };
      
      // Update settings via API
      const response = await api.system.updateConfig({
        theme: updatedSettings.theme,
        telemetry: updatedSettings.telemetry,
        metadata: updatedSettings.metadata
      });
      console.log('Update response:', response);
      
      // Update local state
      set({ 
        settings: updatedSettings,
        isLoading: false 
      });
    } catch (err) {
      console.error('Failed to update system settings:', err);
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to update system settings' 
      });
    }
  },
  
  clearError: () => set({ error: null })
}));
