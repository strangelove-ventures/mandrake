/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sessions resource client
 */
import { apiClient } from '../core/fetcher';
import {
  // Import relevant session types as needed
  DeleteResponse
} from '@mandrake/utils/dist/types/api';

/**
 * Sessions API client
 */
export const sessions = {
  /**
   * List sessions, optionally filtered by workspace
   */
  list: async (workspaceId?: string) => {
    const path = workspaceId 
      ? apiClient.createUrl('/sessions', workspaceId)
      : '/sessions';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get session by ID
   */
  get: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/sessions/${id}`, workspaceId)
      : `/sessions/${id}`;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Create a new session
   */
  create: async (params: any, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/sessions', workspaceId)
      : '/sessions';
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: params
    });
  },
  
  /**
   * Update an existing session
   */
  update: async (id: string, params: any, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/sessions/${id}`, workspaceId)
      : `/sessions/${id}`;
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: params
    });
  },
  
  /**
   * Delete a session
   */
  delete: async (id: string, workspaceId?: string): Promise<DeleteResponse> => {
    const path = workspaceId
      ? apiClient.createUrl(`/sessions/${id}`, workspaceId)
      : `/sessions/${id}`;
      
    return apiClient.fetchJson<DeleteResponse>(path, {
      method: 'DELETE'
    });
  },
  
  /**
   * Send a message to a session
   */
  sendMessage: async (sessionId: string, message: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/sessions/${sessionId}/messages`, workspaceId)
      : `/sessions/${sessionId}/messages`;
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: { content: message }
    });
  },
  
  /**
   * Get message history for a session
   */
  getMessages: async (sessionId: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/sessions/${sessionId}/messages`, workspaceId)
      : `/sessions/${sessionId}/messages`;
      
    return apiClient.fetchJson(path);
  }
};