/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Workspace resource client
 */
import { apiClient } from '../core/fetcher';
import {
  WorkspaceResponse,
  WorkspaceListResponse,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  DeleteResponse,
  WorkspaceStatsResponse
} from '@mandrake/utils/dist/types/api';

/**
 * Workspaces API client
 */
export const workspaces = {
  /**
   * List all workspaces
   */
  list: async (): Promise<WorkspaceListResponse> => {
    return apiClient.fetchJson<WorkspaceListResponse>('/workspaces');
  },
  
  /**
   * Get workspace by ID
   */
  get: async (id: string): Promise<WorkspaceResponse> => {
    return apiClient.fetchJson<WorkspaceResponse>(`/workspaces/${id}`);
  },
  
  /**
   * Create a new workspace
   */
  create: async (params: CreateWorkspaceRequest): Promise<WorkspaceResponse> => {
    return apiClient.fetchJson<WorkspaceResponse>('/workspaces', { 
      method: 'POST', 
      body: params 
    });
  },
  
  /**
   * Update an existing workspace
   */
  update: async (id: string, params: UpdateWorkspaceRequest): Promise<WorkspaceResponse> => {
    return apiClient.fetchJson<WorkspaceResponse>(`/workspaces/${id}`, { 
      method: 'PUT', 
      body: params 
    });
  },
  
  /**
   * Delete a workspace
   */
  delete: async (id: string): Promise<DeleteResponse> => {
    return apiClient.fetchJson<DeleteResponse>(`/workspaces/${id}`, { 
      method: 'DELETE' 
    });
  },
  
  /**
   * Get workspace statistics
   */
  stats: async (id: string): Promise<WorkspaceStatsResponse> => {
    return apiClient.fetchJson<WorkspaceStatsResponse>(`/workspaces/${id}/stats`);
  },
  
  /**
   * Workspace configuration operations
   */
  config: {
    /**
     * Get workspace configuration
     */
    get: async (workspaceId: string) => {
      return apiClient.fetchJson(
        apiClient.createUrl('/config', workspaceId)
      );
    },
    
    /**
     * Update workspace configuration
     */
    update: async (workspaceId: string, config: any) => {
      return apiClient.fetchJson(
        apiClient.createUrl('/config', workspaceId),
        { method: 'PUT', body: config }
      );
    }
  }
};