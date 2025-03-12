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
    ? `/workspaces/${workspaceId}/models` 
    : '/system/models';
    
  console.log(`Fetching models with path: ${basePath} (workspace: ${workspaceId || 'system'})`);
  try {
    // First get the list of models
    const modelsResponse = await apiClient.fetchJson(basePath);
    console.log('Models API response:', modelsResponse); // Debug log
    
    // If we already have the expected format, return it directly
    if (modelsResponse && typeof modelsResponse.active === 'string' && 
        modelsResponse.models && modelsResponse.providers) {
      return [modelsResponse];
    }
    
    // Otherwise we need to transform from the array format to the expected object format
    if (Array.isArray(modelsResponse)) {
      // Get active model from separate endpoint
      let activeId = '';
      try {
        const activeEndpoint = workspaceId 
          ? `/workspaces/${workspaceId}/models/active` 
          : '/system/models/active';
        console.log(`Fetching active model with path: ${activeEndpoint}`);
        const activeResponse = await apiClient.fetchJson(activeEndpoint);
        activeId = activeResponse.id || '';
      } catch (err) {
        console.warn('Could not fetch active model:', err);
      }
      
      // Get providers from separate endpoint
      let providers = {};
      try {
        const providersEndpoint = workspaceId 
          ? `/workspaces/${workspaceId}/providers` 
          : '/system/providers';
        const providersResponse = await apiClient.fetchJson(providersEndpoint);
        
        if (Array.isArray(providersResponse)) {
          // Transform array of providers to object format
          providers = providersResponse.reduce((acc, provider) => {
            acc[provider.id] = {
              type: provider.type || provider.name,
              apiKey: provider.apiKey,
              baseUrl: provider.baseUrl,
              disabled: provider.disabled
            };
            return acc;
          }, {});
        }
      } catch (err) {
        console.warn('Could not fetch providers:', err);
      }
      
      // Transform models array to object format
      const models = modelsResponse.reduce((acc, model) => {
        // Skip items that appear to be providers
        if (model.type === 'provider') return acc;
        
        acc[model.id] = {
          enabled: model.enabled !== false,
          providerId: model.providerId,
          modelId: model.modelId || model.name || model.id,
          config: model.config || {}
        };
        return acc;
      }, {});
      
      const transformedData = {
        active: activeId,
        providers: providers,
        models: models
      };
      
      console.log('Transformed models data:', transformedData);
      return [transformedData];
    }
    
    console.warn('Unknown models response format:', modelsResponse);
    return [{ active: '', providers: {}, models: {} }];
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
      ? `/workspaces/${workspaceId}/models/active` 
      : '/system/models/active';
    
    console.log(`getActive - Fetching from: ${basePath} (workspace: ${workspaceId || 'system'})`);
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
      ? `/workspaces/${workspaceId}/models/active` 
      : '/system/models/active';
    
    console.log(`setActive - Setting model ${modelId} at: ${basePath} (workspace: ${workspaceId || 'system'})`);
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
      ? `/workspaces/${workspaceId}/models/${modelId}` 
      : `/system/models/${modelId}`;
      
    try {
      return apiClient.fetchJson(basePath);
    } catch (error) {
      console.error(`Failed to get model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * List providers
   */
  listProviders: async (workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/workspaces/${workspaceId}/providers` 
      : '/system/providers';
      
    try {
      const response = await apiClient.fetchJson(basePath);
      console.log('Providers API response:', response);
      return response;
    } catch (error) {
      console.error('Failed to list providers:', error);
      throw error;
    }
  },
  
  /**
   * Update a model
   */
  update: async (modelId: string, updates: any, workspaceId?: string) => {
    const basePath = workspaceId 
      ? `/workspaces/${workspaceId}/models/${modelId}` 
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
      ? `/workspaces/${workspaceId}/models` 
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
      ? `/workspaces/${workspaceId}/models/${modelId}` 
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
      ? `/workspaces/${workspaceId}/providers/${providerId}` 
      : `/system/providers/${providerId}`;
      
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
      ? `/workspaces/${workspaceId}/providers` 
      : '/system/providers';
      
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
      ? `/workspaces/${workspaceId}/providers/${providerId}` 
      : `/system/providers/${providerId}`;
      
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
