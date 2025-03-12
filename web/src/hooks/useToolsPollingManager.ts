import { useEffect } from 'react';
import { useToolsStore } from '@/stores/system/tools';
import * as pollingManager from '@/stores/system/tools-polling-manager';

/**
 * Hook to manage tools polling
 * Can enable/disable polling and manually trigger refreshes
 */
export function useToolsPollingManager(options: {
  enabled?: boolean; // Should polling be active
  interval?: number; // Polling interval in ms, default is 10000
  skipInitialFetch?: boolean; // Skip the initial fetch when starting
  workspaceId?: string; // Optional workspace ID for scoping
}) {
  const { 
    enabled = true, 
    interval = 10000, 
    skipInitialFetch = false,
    workspaceId
  } = options;
  
  const { loadServerStatus } = useToolsStore();
  
  // Create a wrapped callback that includes workspace context
  const fetchCallback = () => {
    loadServerStatus(workspaceId).catch(err => {
      console.error('Error in polling server status:', err);
    });
  };
  
  // Set up or tear down polling based on enabled state
  useEffect(() => {
    if (enabled) {
      // Only start if not already polling
      if (!pollingManager.isPolling()) {
        // Set the polling interval
        pollingManager.setPollingInterval(interval);
        
        // Start polling with our callback
        pollingManager.startPolling(fetchCallback, interval);
        
        // If skipping initial fetch, update the lastPollTime without actually fetching
        if (skipInitialFetch) {
          pollingManager.stopPolling();
          pollingManager.startPolling(fetchCallback, interval);
        }
      }
    } else {
      // Stop polling if disabled
      pollingManager.stopPolling();
    }
    
    // Clean up when component unmounts
    return () => {
      // Only stop polling if this component started it
      if (enabled && pollingManager.isPolling()) {
        pollingManager.stopPolling();
      }
    };
  }, [enabled, fetchCallback, interval, skipInitialFetch]);
  
  // Return utilities for managing polling
  return {
    isPolling: pollingManager.isPolling,
    startPolling: () => pollingManager.startPolling(fetchCallback, interval),
    stopPolling: pollingManager.stopPolling,
    refreshNow: () => pollingManager.manualPoll(fetchCallback),
    getPollingState: pollingManager.getPollingState,
  };
}
