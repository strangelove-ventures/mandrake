import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface ServerStatus {
  status: string;
  state?: any;
  error?: string;
}

interface UseServerStatusOptions {
  pollingInterval?: number;
  skipInitialFetch?: boolean;
  disabled?: boolean;
  workspaceId?: string;
}

/**
 * Custom hook for loading and managing server status with more control
 * NOTE: ALL POLLING HAS BEEN REMOVED
 */
export function useServerStatusWithControls({
  workspaceId,
}: UseServerStatusOptions = {}) {
  const [serverStatus, setServerStatus] = useState<Record<string, ServerStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to load server status
  const loadServerStatus = useCallback(async () => {
    if (isLoading) return {};
    
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await api.tools.getServersStatus(workspaceId);
      
      // Use a functional update to be extra safe
      setServerStatus(prev => {
        // Only update if there are actual changes to prevent unnecessary rerenders
        const hasChanges = Object.keys(status).some(serverId => {
          if (!prev[serverId]) return true;
          return JSON.stringify(prev[serverId]) !== JSON.stringify(status[serverId]);
        });
        
        return hasChanges ? status : prev;
      });
      
      return status;
    } catch (err) {
      console.error('Failed to load server status:', err);
      // Don't set error here since it's not critical and would show in UI
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, workspaceId]);
  
  // Function to load status for a specific server
  const loadServerStatusById = useCallback(async (serverId: string) => {
    if (isLoading) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await api.tools.getServerStatus(serverId, workspaceId);
      
      // Only update if there are actual changes
      setServerStatus(prev => {
        if (!prev[serverId] || JSON.stringify(prev[serverId]) !== JSON.stringify(status)) {
          return {
            ...prev,
            [serverId]: status
          };
        }
        return prev;
      });
      
      return status;
    } catch (err) {
      console.error(`Failed to load status for server ${serverId}:`, err);
      setError(err instanceof Error ? err.message : `Failed to load status for server ${serverId}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, workspaceId]);
  
  // All polling control methods are now no-ops
  const startPolling = useCallback(() => {
    console.log('Status polling is disabled');
  }, []);
  
  const stopPolling = useCallback(() => {
    console.log('Status polling is already disabled');
  }, []);
  
  return {
    serverStatus,
    isLoading,
    error,
    loadServerStatus,
    loadServerStatusById,
    startPolling, // Kept for API compatibility
    stopPolling,  // Kept for API compatibility
    refreshNow: loadServerStatus
  };
}
