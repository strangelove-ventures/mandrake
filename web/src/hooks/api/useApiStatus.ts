/* eslint-disable @typescript-eslint/no-explicit-any */
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
        console.log('Checking API status...');
        const response = await api.system.getStatus();
        console.log('API response:', response);
        
        if (isMounted) {
          setStatus({
            status: 'online',
            message: `API is online (${(response as any).status || 'OK'})`
          });
          console.log('API status set to online');
        }
      } catch (error) {
        console.error('API status check error:', error);
        if (isMounted) {
          setStatus({
            status: 'offline',
            message: 'API is offline. Make sure the API is running.',
            error: error instanceof Error ? error : new Error(String(error))
          });
          console.log('API status set to offline');
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