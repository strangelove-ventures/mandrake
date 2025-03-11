/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Models resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * Models API client
 */
export const models = {
  /**
 * List all models and providers
 */
list: async (workspaceId?: string) => {
  const basePath = workspaceId 
    ? `/api/workspaces/${workspaceId}/models` 
    : '/system/models';
    
  try {
    const response = await apiClient.fetchJson(basePath);
    console.log('Models API response:', response); // Debug log
    
    // If the response is already in the expected format, return it directly
    if (response && typeof response.active === 'string' && response.models && response.providers) {
      return [response];
    }
    
    // Otherwise, transform the response into the expected format
    return [response]; 
  } catch (error) {
    console.error('Failed to list models:', error);
    throw error;
  }
},
  
  /**
   * Get active model ID
   */
  getActive: async (workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/active` 
      : '/system/models/active';
      
    try {
      const response = await apiClient.fetchJson(basePath);
      return response;
    } catch (error) {
      console.error('Failed to get active model:', error);
      throw error;
    }
  },
  
  /**
   * Set active model
   */
  setActive: async (modelId: string, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/active` 
      : '/system/models/active';
      
    try {
      return apiClient.fetchJson(basePath, {
        method: 'PUT',
        body: { id: modelId }
      });
    } catch (error) {
      console.error('Failed to set active model:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific model
   */
  get: async (modelId: string, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/${modelId}` 
      : `/system/models/${modelId}`;
      
    try {
      return apiClient.fetchJson(basePath);
    } catch (error) {
      console.error(`Failed to get model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update a model
   */
  update: async (modelId: string, updates: any, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/${modelId}` 
      : `/system/models/${modelId}`;
      
    try {
      return apiClient.fetchJson(basePath, {
        method: 'PUT',
        body: updates
      });
    } catch (error) {
      console.error(`Failed to update model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Add a new model
   */
  create: async (modelId: string, config: any, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models` 
      : '/system/models';
      
    try {
      return apiClient.fetchJson(basePath, {
        method: 'POST',
        body: { ...config, id: modelId }
      });
    } catch (error) {
      console.error('Failed to create model:', error);
      throw error;
    }
  },
  
  /**
   * Delete a model
   */
  delete: async (modelId: string, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/${modelId}` 
      : `/system/models/${modelId}`;
      
    try {
      return apiClient.fetchJson(basePath, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Failed to delete model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update a provider
   */
  updateProvider: async (providerId: string, updates: any, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/providers/${providerId}` 
      : `/system/models/providers/${providerId}`;
      
    try {
      return apiClient.fetchJson(basePath, {
        method: 'PUT',
        body: updates
      });
    } catch (error) {
      console.error(`Failed to update provider ${providerId}:`, error);
      throw error;
    }
  },
  
  /**
   * Add a new provider
   */
  createProvider: async (providerId: string, config: any, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/providers` 
      : '/system/models/providers';
      
    try {
      return apiClient.fetchJson(basePath, {
        method: 'POST',
        body: { ...config, id: providerId }
      });
    } catch (error) {
      console.error('Failed to create provider:', error);
      throw error;
    }
  },
  
  /**
   * Delete a provider
   */
  deleteProvider: async (providerId: string, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/api/workspaces/${workspaceId}/models/providers/${providerId}` 
      : `/system/models/providers/${providerId}`;
      
    try {
      return apiClient.fetchJson(basePath, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Failed to delete provider ${providerId}:`, error);
      throw error;
    }
  }
};
