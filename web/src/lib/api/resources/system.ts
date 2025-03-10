/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * System resource client
 */
import { apiClient } from '../core/fetcher';

/**
 * System API client for system-wide operations
 */
export const system = {
  /**
   * Get system status
   */
  getStatus: async () => {
    return apiClient.fetchJson('/system');
  },
  
  /**
   * Get system configuration
   */
  getConfig: async () => {
    return apiClient.fetchJson('/system/config');
  },
  
  /**
   * Update system configuration
   */
  updateConfig: async (config: any) => {
    return apiClient.fetchJson('/system/config', {
      method: 'PUT',
      body: config
    });
  },
  
  /**
   * Get system version information
   */
  getVersion: async () => {
    return apiClient.fetchJson('/version');
  }
};