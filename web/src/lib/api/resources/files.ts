/**
 * Files resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * Files API client
 */
export const files = {
  /**
   * List files in a directory
   */
  list: async (workspaceId: string, path: string = '/') => {
    return apiClient.fetchJson(
      apiClient.createUrl(`/files?path=${encodeURIComponent(path)}`, workspaceId)
    );
  },
  
  /**
   * Get file content
   */
  get: async (workspaceId: string, path: string) => {
    return apiClient.fetchJson(
      apiClient.createUrl(`/files/${encodeURIComponent(path)}`, workspaceId)
    );
  },
  
  /**
   * Create or update a file
   */
  write: async (workspaceId: string, path: string, content: string) => {
    return apiClient.fetchJson(
      apiClient.createUrl(`/files/${encodeURIComponent(path)}`, workspaceId),
      {
        method: 'PUT',
        body: { content }
      }
    );
  },
  
  /**
   * Delete a file
   */
  delete: async (workspaceId: string, path: string) => {
    return apiClient.fetchJson(
      apiClient.createUrl(`/files/${encodeURIComponent(path)}`, workspaceId),
      {
        method: 'DELETE'
      }
    );
  },
  
  /**
   * Search files by content
   */
  search: async (workspaceId: string, query: string, options?: { path?: string, extensions?: string[] }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('query', query);
    
    if (options?.path) {
      queryParams.append('path', options.path);
    }
    
    if (options?.extensions && options.extensions.length > 0) {
      queryParams.append('extensions', options.extensions.join(','));
    }
    
    return apiClient.fetchJson(
      apiClient.createUrl(`/files/search?${queryParams.toString()}`, workspaceId)
    );
  }
};