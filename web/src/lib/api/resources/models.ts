/**
 * Models resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * Models API client
 */
export const models = {
  /**
   * List all available models
   */
  list: async (workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/models', workspaceId)
      : '/models';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get model by ID
   */
  get: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/models/${id}`, workspaceId)
      : `/models/${id}`;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get active model configuration
   */
  getActive: async (workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/models/active', workspaceId)
      : '/models/active';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Set active model
   */
  setActive: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/models/active', workspaceId)
      : '/models/active';
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: { id }
    });
  },
  
  /**
   * List available model providers
   */
  providers: {
    list: async () => {
      return apiClient.fetchJson('/providers');
    },
    
    /**
     * Get provider by ID
     */
    get: async (id: string) => {
      return apiClient.fetchJson(`/providers/${id}`);
    }
  }
};