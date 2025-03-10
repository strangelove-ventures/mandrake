/**
 * Hook to check API status
 */
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ApiStatus {
  status: 'online' | 'offline' | 'loading';
  message: string;
  error?: Error;
}

/**
 * Hook to check if the API is online
 */
export function useApiStatus() {
  const [status, setStatus] = useState<ApiStatus>({
    status: 'loading',
    message: 'Checking API status...'
  });

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const response = await api.system.getStatus();
        
        if (isMounted) {
          setStatus({
            status: 'online',
            message: `API is online (${response.status || 'OK'})`
          });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            status: 'offline',
            message: 'API is offline. Make sure the API is running.',
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  return status;
}