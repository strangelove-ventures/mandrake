/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Prompt resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * Prompt API client for managing system prompts
 */
export const prompt = {
  /**
   * Get current prompt configuration
   */
  get: async (workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/prompt', workspaceId)
      : '/prompt';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Update prompt configuration
   */
  update: async (config: any, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/prompt', workspaceId)
      : '/prompt';
      
    return apiClient.fetchJson(path, {
      method: 'PUT',
      body: config
    });
  },
  
  /**
   * Get available prompt templates
   */
  getTemplates: async (workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl('/prompt/templates', workspaceId)
      : '/prompt/templates';
      
    return apiClient.fetchJson(path);
  },
  
  /**
   * Get a specific prompt template
   */
  getTemplate: async (id: string, workspaceId?: string) => {
    const path = workspaceId
      ? apiClient.createUrl(`/prompt/templates/${id}`, workspaceId)
      : `/prompt/templates/${id}`;
      
    return apiClient.fetchJson(path);
  }
};