import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface ServerStatus {
  status: string;
  state?: any;
  error?: string;
}

/**
 * Custom hook for loading and managing server status
 */
export function useServerStatus(workspaceId?: string) {
  const [serverStatus, setServerStatus] = useState<Record<string, ServerStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to load server status
  const loadServerStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await api.tools.getServersStatus(workspaceId);
      setServerStatus(status);
      
      return status;
    } catch (err) {
      console.error('Failed to load server status:', err);
      // Don't set error here since it's not critical and would show in UI
      // Just keep the previous status state intact
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);
  
  // Function to load status for a specific server
  const loadServerStatusById = useCallback(async (serverId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await api.tools.getServerStatus(serverId, workspaceId);
      
      // Update the status for this specific server
      setServerStatus(prev => ({
        ...prev,
        [serverId]: status
      }));
      
      return status;
    } catch (err) {
      console.error(`Failed to load status for server ${serverId}:`, err);
      setError(err instanceof Error ? err.message : `Failed to load status for server ${serverId}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);
  
  // Set up polling
  useEffect(() => {
    // Load status immediately
    loadServerStatus().catch(err => {
      console.error('Error in initial server status loading:', err);
    });
    
    // Set up polling interval
    const interval = setInterval(() => {
      loadServerStatus().catch(err => {
        console.error('Error in polling server status:', err);
      });
    }, 10000); // Poll every 10 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [loadServerStatus]);
  
  return {
    serverStatus,
    isLoading,
    error,
    loadServerStatus,
    loadServerStatusById
  };
}
