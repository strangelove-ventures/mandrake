/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dynamic context resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * Dynamic context API client
 * Manages dynamic context for AI sessions
 */
export const dynamic = {
  /**
   * Get current dynamic context configuration
   */
  get: async (workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/dynamic', workspaceId)
      : '/dynamic';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Update dynamic context configuration
   */
  update: async (config: any, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/dynamic', workspaceId)
      : '/dynamic';
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: config
    });
  },
  
  /**
   * Add a specific item to the dynamic context
   */
  addItem: async (item: any, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/dynamic/items', workspaceId)
      : '/dynamic/items';
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: item
    });
  },
  
  /**
   * Remove an item from the dynamic context
   */
  removeItem: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/dynamic/items/${id}`, workspaceId)
      : `/dynamic/items/${id}`;
      
    return apiClient.fetchJson(path, {
      method: 'DELETE'
    });
  },
  
  /**
   * Clear all dynamic context items
   */
  clear: async (workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/dynamic/clear', workspaceId)
      : '/dynamic/clear';
      
    return apiClient.fetchJson(path, {
      method: 'POST'
    });
  }
};