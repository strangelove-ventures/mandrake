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
    const basePath = workspaceId 
      ? `/workspaces/${workspaceId}/tools/configs`
      : '/system/tools/configs';
      
    try {
      // Get the list of configuration IDs
      console.log(`[api] Fetching tools config list from ${basePath}`);
      const configIds = await apiClient.fetchJson(basePath);
      console.log('Config IDs:', configIds);
      
      // Get the active config ID
      const activePath = workspaceId
        ? `/workspaces/${workspaceId}/tools/configs/active`
        : '/system/tools/configs/active';
      console.log(`[api] Fetching active config from ${activePath}`);
      const activeResult = await apiClient.fetchJson(activePath);
      const activeId = activeResult.active;
      console.log('Active config ID:', activeId);
      
      // Build a full config by fetching each config set
      const configs: Record<string, any> = {};
      for (const id of configIds) {
        try {
          const configPath = workspaceId
            ? `/workspaces/${workspaceId}/tools/configs/${id}`
            : `/system/tools/configs/${id}`;
          console.log(`[api] Fetching config details from ${configPath}`);
          const configDetails = await apiClient.fetchJson(configPath);
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
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/configs/${id}`
      : `/system/tools/configs/${id}`;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Create a new tool configuration
   */
  create: async (config: any, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/configs`
      : '/system/tools/configs';
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: config
    });
  },
  
  /**
   * Update an existing tool configuration
   */
  update: async (id: string, config: any, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/configs/${id}`
      : `/system/tools/configs/${id}`;
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: config
    });
  },
  
  /**
   * Delete a tool configuration
   */
  delete: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/configs/${id}`
      : `/system/tools/configs/${id}`;
      
    return apiClient.fetchJson(path, {
      method: 'DELETE'
    });
  },
  
  /**
   * Get active tool configuration
   */
  getActive: async (workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/configs/active`
      : '/system/tools/configs/active';
      
    const result = await apiClient.fetchJson(path);
    return { id: result.active };
  },
  
  /**
   * Set active tool configuration
   */
  setActive: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/configs/active`
      : '/system/tools/configs/active';
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: { id }
    });
  },
  
  /**
   * Start a server with configuration
   */
  startServer: async (serverId: string, config: any, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/servers`
      : '/system/tools/servers';

    console.log(`[api] Starting server ${serverId} at ${path}`);
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: {
        type: serverId,
        config: config
      }
    });
  },

  /**
   * Stop a running server
   */
  stopServer: async (serverId: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/servers/${serverId}`
      : `/system/tools/servers/${serverId}`;
      
    console.log(`[api] Stopping server ${serverId} at ${path}`);
    return apiClient.fetchJson(path, {
      method: 'DELETE'
    });
  },
  
  /**
   * Get status for all servers
   */
  getServersStatus: async (workspaceId?: string) => {
    const basePath = workspaceId
      ? `/workspaces/${workspaceId}/tools/servers/status`
      : '/system/tools/servers/status';
      
    return apiClient.fetchJson(basePath);
  },

  /**
   * Get status for a specific server
   */
  getServerStatus: async (id: string, workspaceId?: string) => {
    const basePath = workspaceId
      ? `/workspaces/${workspaceId}/tools/servers/status/${id}`
      : `/system/tools/servers/status/${id}`;
      
    return apiClient.fetchJson(basePath);
  },

  /**
   * Get methods available on a specific server
   */
  getServerMethods: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/operations/server/${id}`
      : `/system/tools/operations/server/${id}`;
      
    return apiClient.fetchJson(path);
  },

  /**
   * Get details for a specific method
   */
  getMethodDetails: async (serverId: string, methodName: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/operations/server/${serverId}/method/${methodName}`
      : `/system/tools/operations/server/${serverId}/method/${methodName}`;
      
    return apiClient.fetchJson(path);
  },

  /**
   * Invoke a method on a server
   */
  invokeMethod: async (serverId: string, methodName: string, params: any, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/tools/operations/invoke`
      : '/system/tools/operations/invoke';
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: {
        serverId,
        toolName: methodName,
        params
      }
    });
  }
};