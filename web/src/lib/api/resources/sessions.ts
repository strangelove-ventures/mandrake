/**
 * Sessions resource client
 */
import { apiClient } from '../core/fetcher';
import {
  SessionResponse,
  SessionListResponse,
  CreateSessionRequest,
  UpdateSessionRequest,
  DeleteResponse
} from '@mandrake/utils/dist/types/api';

/**
 * Sessions API client
 */
export const sessions = {
  /**
   * List sessions, optionally filtered by workspace
   */
  list: async (workspaceId?: string): Promise<SessionListResponse> => {
    const path = workspaceId 
      ? apiClient.createUrl('/sessions', workspaceId)
      : '/system/sessions';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get session by ID
   */
  get: async (id: string, workspaceId?: string): Promise<SessionResponse> => {
    const path = workspaceId
      ? apiClient.createUrl(`/sessions/${id}`, workspaceId)
      : `/system/sessions/${id}`;
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Create a new session
   */
  create: async (params: CreateSessionRequest, workspaceId?: string): Promise<SessionResponse> => {
    const path = workspaceId
      ? apiClient.createUrl('/sessions', workspaceId)
      : '/system/sessions';
      
    return apiClient.fetchJson(path, {
      method: 'POST',
      body: params
    });
  },
  
  /**
   * Update an existing session
   */
  update: async (id: string, params: UpdateSessionRequest, workspaceId?: string): Promise<SessionResponse> => {
    const path = workspaceId
      ? apiClient.createUrl(`/sessions/${id}`, workspaceId)
      : `/system/sessions/${id}`;
      
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
      : `/system/sessions/${id}`;
      
    return apiClient.fetchJson<DeleteResponse>(path, {
      method: 'DELETE'
    });
  },
  
  /**
   * Send a message to a session through the streaming API
   */
  sendMessage: async (sessionId: string, message: string, workspaceId?: string): Promise<void> => {
    // URL pattern for the new WebSocket-based API
    const path = workspaceId
      ? `/workspaces/${workspaceId}/sessions/${sessionId}/streaming/request`
      : `/system/sessions/${sessionId}/streaming/request`;
      
    console.log(`Sending message to: ${path}`);
    
    // Use fetchStreaming to avoid expecting a JSON response
    return apiClient.fetchStreaming(path, {
      method: 'POST',
      body: { content: message }
    });
  },
  
  /**
   * Get messages for a session
   */
  getMessages: async (sessionId: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/sessions/${sessionId}/history`
      : `/system/sessions/${sessionId}/history`;
      
    console.log(`Fetching session messages from: ${path}`);
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get system prompt for a session
   */
  getSessionPrompt: async (sessionId: string, workspaceId?: string) => {
    const path = workspaceId
      ? `/workspaces/${workspaceId}/sessions/${sessionId}/streaming/prompt`
      : `/system/sessions/${sessionId}/streaming/prompt`;
      
    return apiClient.fetchJson<{ sessionId: string; systemPrompt: string }>(path);
  },
};