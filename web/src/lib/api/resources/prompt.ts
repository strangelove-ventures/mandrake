/**
 * Prompt resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * Prompt configuration in API format
 */
export interface PromptConfigApi {
  system: string;
  includeWorkspaceMetadata?: boolean;
  includeSystemInfo?: boolean;
  includeDateTime?: boolean;
  // Legacy fields for backwards compatibility
  metadata?: boolean;
  dateFormat?: string;
}

/**
 * Prompt API client for managing system prompts
 */
export const prompt = {
  /**
   * Get current prompt configuration
   */
  get: async (workspaceId?: string): Promise<PromptConfigApi> => {
    try {
      // Try first with /prompt directly
      const path = workspaceId
        ? `/workspaces/${workspaceId}/prompt`
        : '/prompt';
        
      console.log(`Fetching prompt config from ${path}`);
      return await apiClient.fetchJson(path);
    } catch (error) {
      console.error('Failed to fetch prompt config', error);
      
      // Return default values as a last resort
      console.warn('Returning default prompt config as fallback');
      return {
        system: "You are Mandrake, a seasoned AI assistant with deep expertise in software development and system operations.",
        includeWorkspaceMetadata: true,
        includeSystemInfo: true,
        includeDateTime: true
      };
    }
  },
  
  /**
   * Update prompt configuration
   */
  update: async (config: PromptConfigApi, workspaceId?: string): Promise<{ success: boolean }> => {
    try {
      // Try first with /prompt directly
      const path = workspaceId
        ? `/workspaces/${workspaceId}/prompt`
        : '/prompt';
        
      console.log(`Updating prompt config at ${path}`, config);
      return await apiClient.fetchJson(path, {
        method: 'PUT',
        body: config
      });
    } catch (error) {
      console.error('Failed to update prompt config', error);
      throw error;
    }
  }
};
