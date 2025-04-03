/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/core/fetcher';

interface UsePollingUpdatesProps {
  sessionId: string;
  workspaceId?: string;
  enabled?: boolean;
  interval?: number; // in milliseconds
}

/**
 * Hook for polling session updates at regular intervals
 */
export function usePollingUpdates({
  sessionId,
  workspaceId = '',
  enabled = true,
  interval = 1000 // Poll every second by default
}: UsePollingUpdatesProps) {
  const [isPolling, setIsPolling] = useState(enabled);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Start/stop polling based on enabled prop
  useEffect(() => {
    setIsPolling(enabled);
  }, [enabled]);

  // Poll for updates
  useEffect(() => {
    if (!sessionId || !isPolling) return;

    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const path = workspaceId
          ? `/workspaces/${workspaceId}/sessions/${sessionId}/history`
          : `/system/sessions/${sessionId}/history`;

        console.log(`Polling session history from: ${path}`);
        const result = await apiClient.fetchJson(path);
        setData(result);
        setError(null);
        setLastUpdate(new Date());
      } catch (err) {
        console.error('Polling error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchData();

    // Set up polling interval
    const intervalId = setInterval(fetchData, interval);

    // Clean up
    return () => clearInterval(intervalId);
  }, [sessionId, workspaceId, isPolling, interval]);

  // Control functions
  const startPolling = () => setIsPolling(true);
  const stopPolling = () => setIsPolling(false);

  return {
    data,
    error,
    isLoading,
    isPolling,
    lastUpdate,
    startPolling,
    stopPolling
  };
}
