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
    // If workspaceId looks like a UUID, but is incorrectly placed
    if (workspaceId && workspaceId.length > 30 && workspaceId.includes('-')) {
      // First, log the standard format for debugging
      const standardPath = `/workspaces/${workspaceId}/dynamic`;
      console.log(`Dynamic context list standard path: ${standardPath}`);
      
      return apiClient.fetchJson(standardPath);
    }
    
    const path = workspaceId
      ? `/workspaces/${workspaceId}/dynamic`
      : '/workspace/dynamic';
      
    console.log(`Dynamic context list - path: ${path}`);
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get a specific dynamic context item
   */
  get: async (id: string, workspaceId?: string) => {
    // Check if id is actually a workspace ID (handling potential misuse)
    if (id && id.length > 30 && id.includes('-') && !workspaceId) {
      console.log(`Warning: ID ${id} looks like a workspaceId but was passed as ID`);
      
      // Try using the proper path format
      const properPath = `/workspaces/${id}/dynamic`;
      console.log(`Dynamic context get with corrected path: ${properPath}`);
      return apiClient.fetchJson(properPath);
    }
    
    const path = workspaceId
      ? `/workspaces/${workspaceId}/dynamic/${id}`
      : `/workspace/dynamic/${id}`;
      
    console.log(`Dynamic context get - path: ${path}`);
    return apiClient.fetchJson(path);
  },
  
  /**
   * Create a new dynamic context item
   */
  create: async (context: any, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/dynamic`
      : '/workspace/dynamic';
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: context
    });
  },
  
  /**
   * Update an existing dynamic context item
   */
  update: async (id: string, context: any, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/dynamic/${id}`
      : `/workspace/dynamic/${id}`;
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: context
    });
  },
  
  /**
   * Delete a dynamic context item
   */
  delete: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/dynamic/${id}`
      : `/workspace/dynamic/${id}`;
      
    return apiClient.fetchJson(path, {
      method: 'DELETE'
    });
  }
};
