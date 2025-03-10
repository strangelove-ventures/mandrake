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
    const path = workspaceId
      ? apiClient.createUrl('/tools', workspaceId)
      : '/tools';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get tool configuration by ID
   */
  get: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/tools/${id}`, workspaceId)
      : `/tools/${id}`;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Create a new tool configuration
   */
  create: async (config: any, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/tools', workspaceId)
      : '/tools';
      
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
      ? apiClient.createUrl(`/tools/${id}`, workspaceId)
      : `/tools/${id}`;
      
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
      ? apiClient.createUrl(`/tools/${id}`, workspaceId)
      : `/tools/${id}`;
      
    return apiClient.fetchJson(path, {
      method: 'DELETE'
    });
  },
  
  /**
   * Get active tool configuration
   */
  getActive: async (workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/tools/active', workspaceId)
      : '/tools/active';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Set active tool configuration
   */
  setActive: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/tools/active', workspaceId)
      : '/tools/active';
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: { id }
    });
  }
};