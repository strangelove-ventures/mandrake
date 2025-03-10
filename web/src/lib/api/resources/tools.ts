/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tools resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * Tools API client
 */
export const tools = {
  /**
   * List all available tool configurations
   */
  list: async (workspaceId?: string) => {
    const basePath = '/system/tools/configs';
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    try {
      // Get the list of configuration IDs
      const configIds = await apiClient.fetchJson(path);
      console.log('Config IDs:', configIds);
      
      // Get the active config ID
      const activeResult = await apiClient.fetchJson(`${basePath}/active`);
      const activeId = activeResult.active;
      console.log('Active config ID:', activeId);
      
      // Build a full config by fetching each config set
      const configs: Record<string, any> = {};
      for (const id of configIds) {
        try {
          const configDetails = await apiClient.fetchJson(`${basePath}/${id}`);
          configs[id] = configDetails;
        } catch (err) {
          console.error(`Failed to fetch config details for ${id}:`, err);
        }
      }
      
      // Build the combined config structure
      const fullConfig = {
        active: activeId,
        configs
      };
      
      console.log('Constructed full config:', fullConfig);
      return [fullConfig]; // Return in the format expected by the component
    } catch (error) {
      console.error('Failed to list tools configs:', error);
      throw error;
    }
  },
  
  /**
   * Get tool configuration by ID
   */
  get: async (id: string, workspaceId?: string) => {
    const basePath = `/system/tools/configs/${id}`;
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Create a new tool configuration
   */
  create: async (config: any, workspaceId?: string) => {
    const basePath = '/system/tools/configs';
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: config
    });
  },
  
  /**
   * Update an existing tool configuration
   */
  update: async (id: string, config: any, workspaceId?: string) => {
    const basePath = `/system/tools/configs/${id}`;
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: config
    });
  },
  
  /**
   * Delete a tool configuration
   */
  delete: async (id: string, workspaceId?: string) => {
    const basePath = `/system/tools/configs/${id}`;
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path, {
      method: 'DELETE'
    });
  },
  
  /**
   * Get active tool configuration
   */
  getActive: async (workspaceId?: string) => {
    const basePath = '/system/tools/configs/active';
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    const result = await apiClient.fetchJson(path);
    return { id: result.active };
  },
  
  /**
   * Set active tool configuration
   */
  setActive: async (id: string, workspaceId?: string) => {
    const basePath = '/system/tools/configs/active';
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: { id }
    });
  }
};