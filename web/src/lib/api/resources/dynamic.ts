/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dynamic context resource client
 */
import { apiClient } from '../core/fetcher';

export const dynamic = {
  /**
   * List all dynamic context items
   */
  list: async (workspaceId?: string) => {
    const basePath = '/workspace/dynamic';
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get a specific dynamic context item
   */
  get: async (id: string, workspaceId?: string) => {
    const basePath = `/workspace/dynamic/${id}`;
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Create a new dynamic context item
   */
  create: async (context: any, workspaceId?: string) => {
    const basePath = '/workspace/dynamic';
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: context
    });
  },
  
  /**
   * Update an existing dynamic context item
   */
  update: async (id: string, context: any, workspaceId?: string) => {
    const basePath = `/workspace/dynamic/${id}`;
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: context
    });
  },
  
  /**
   * Delete a dynamic context item
   */
  delete: async (id: string, workspaceId?: string) => {
    const basePath = `/workspace/dynamic/${id}`;
    const path = workspaceId
      ? apiClient.createUrl(basePath, workspaceId)
      : basePath;
      
    return apiClient.fetchJson(path, {
      method: 'DELETE'
    });
  }
};
