'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface ServerMethodsListProps {
  serverId: string;
  onSelectMethod: (methodName: string) => void;
  refreshStatus?: () => void;
  isRefreshing?: boolean;
  workspaceId?: string;
  onLoadError?: (error: any, details?: any) => void;
  onLoadSuccess?: () => void;
}

export default function ServerMethodsList({ 
  serverId, 
  onSelectMethod, 
  refreshStatus, 
  isRefreshing,
  workspaceId,
  onLoadError,
  onLoadSuccess
}: ServerMethodsListProps) {
  // Use local state only for methods
  const [methods, setMethods] = useState<any[]>([]);
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  
  // State for server logs (when there's an error)
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [errorDetails, setErrorDetails] = useState<{ message: string, status: string } | null>(null);

  // Load methods for the server - only on initial mount
  useEffect(() => {
    const fetchMethods = async () => {
      setLoadingState('loading');
      setErrorDetails(null);
      setServerLogs([]);
      
      try {
        // Fetch directly from API to avoid any store-based side effects
        console.log(`Fetching methods for server ${serverId}...`);
        const response = await api.tools.getServerMethods(serverId, workspaceId);
        
        // Check if the response has an error property (API-level error)
        if ('error' in response) {
          console.error(`API returned error for server ${serverId}:`, response.error);
          setLoadingState('error');
          setErrorDetails({
            message: response.error,
            status: response.status || 'unknown_error'
          });
          
          // If logs are available, show them
          if (response.logs && Array.isArray(response.logs)) {
            setServerLogs(response.logs);
          }
          
          onLoadError?.(new Error(response.error), response);
          return;
        }
        
        // Check if we got an empty tools array with a warning
        if ('warning' in response) {
          console.warn(`Warning for server ${serverId}:`, response.warning);
          setLoadingState('success'); // Still mark as success but with empty methods
          setMethods([]);
          setErrorDetails({
            message: response.warning,
            status: response.status || 'warning'
          });
          return;
        }
        
        // Normal case - we got an array of methods
        setMethods(Array.isArray(response) ? response : []);
        setLoadingState('success');
        onLoadSuccess?.();
      } catch (err) {
        console.error('Error loading methods:', err);
        setLoadingState('error');
        setErrorDetails({
          message: err instanceof Error ? err.message : String(err),
          status: 'network_error'
        });
        onLoadError?.(err, { status: 'network_error' });
      }
    };
    
    fetchMethods();
  }, [serverId, workspaceId, onLoadError, onLoadSuccess]);
  
  // Function to refresh methods
  const handleRefreshMethods = async () => {
    setLoadingState('loading');
    setErrorDetails(null);
    setServerLogs([]);
    
    try {
      // Fetch directly from API to avoid any store-based side effects
      console.log(`Refreshing methods for server ${serverId}...`);
      const response = await api.tools.getServerMethods(serverId, workspaceId);
      
      // Check if the response has an error property (API-level error)
      if ('error' in response) {
        console.error(`API returned error when refreshing methods for server ${serverId}:`, response.error);
        setLoadingState('error');
        setErrorDetails({
          message: response.error,
          status: response.status || 'unknown_error'
        });
        
        // If logs are available, show them
        if (response.logs && Array.isArray(response.logs)) {
          setServerLogs(response.logs);
        }
        
        onLoadError?.(new Error(response.error));
        return;
      }
      
      // Check if we got an empty tools array with a warning
      if ('warning' in response) {
        console.warn(`Warning for server ${serverId}:`, response.warning);
        setLoadingState('success'); // Still mark as success but with empty methods
        setMethods([]);
        setErrorDetails({
          message: response.warning,
          status: response.status || 'warning'
        });
        return;
      }
      
      // Normal case - we got an array of methods
      setMethods(Array.isArray(response) ? response : []);
      setLoadingState('success');
      onLoadSuccess?.();
    } catch (err) {
      console.error('Error refreshing methods:', err);
      setLoadingState('error');
      setErrorDetails({
        message: err instanceof Error ? err.message : String(err),
        status: 'network_error'
      });
      onLoadError?.(err);
    }
  };
  
  // If loading, show a loading state
  if (loadingState === 'loading') {
    return (
      <div className="text-center p-4">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sticky top-0 bg-background z-10 py-2 gap-2">
        <h3 className="text-lg font-medium">Available Methods - {serverId}</h3>
        
        <div className="flex flex-wrap space-x-2 mt-2 sm:mt-0">
          {/* Method refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshMethods}
            disabled={loadingState === 'loading'}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingState === 'loading' ? 'animate-spin' : ''}`} />
            Refresh Methods
          </Button>
          
          {/* Status refresh button (only if provided) */}
          {refreshStatus && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
            </Button>
          )}
        </div>
      </div>
      
      {methods.length > 0 ? (
        <div className="overflow-y-auto max-h-[60vh] pr-1">
          <ul className="space-y-2">
            {methods.map(method => (
            <li 
              key={method.name}
              className="p-3 border rounded-md flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => onSelectMethod(method.name)}
            >
              <div>
                <div className="font-medium">{method.name}</div>
                {method.description && (
                  <div className="text-sm text-gray-500">{method.description}</div>
                )}
              </div>
              <div className="flex items-center">
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </li>
          ))}
          </ul>
        </div>
      ) : (
        <div className="text-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          {/* Different messages based on state */}
          {loadingState === 'loading' ? (
            <p className="text-gray-500 dark:text-gray-400">
              Loading methods...
            </p>
          ) : errorDetails ? (
            <div className="space-y-4">
              <p className="text-red-500 dark:text-red-400 font-medium">
                {errorDetails.message}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {errorDetails.status === 'empty' ? (
                  'This server is running but has no available methods. It may not be properly implementing the MCP protocol.'
                ) : errorDetails.status === 'tools_error' ? (
                  'The server is running but encountered an error when trying to list its methods.'
                ) : errorDetails.status === 'server_error' ? (
                  'There was a problem communicating with the server.'
                ) : (
                  'There was a problem loading methods from this server.'
                )}
              </p>
              
              {/* Show server logs if available */}
              {serverLogs.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Server Logs:</p>
                  <div className="bg-gray-800 text-gray-200 p-2 rounded-md text-xs font-mono max-h-32 overflow-y-auto text-left">
                    {serverLogs.map((log, index) => (
                      <div key={index} className="py-1">{log}</div>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                className="mt-4"
                onClick={handleRefreshMethods}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Loading Methods
              </Button>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No methods found for this server
            </p>
          )}
        </div>
      )}
    </div>
  );
}
