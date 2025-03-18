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
}

export default function ServerMethodsList({ 
  serverId, 
  onSelectMethod, 
  refreshStatus, 
  isRefreshing,
  workspaceId
}: ServerMethodsListProps) {
  // Use local state only for methods
  const [methods, setMethods] = useState<any[]>([]);
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  
  // Load methods for the server - only on initial mount
  useEffect(() => {
    const fetchMethods = async () => {
      setLoadingState('loading');
      try {
        // Fetch directly from API to avoid any store-based side effects
        const methodList = await api.tools.getServerMethods(serverId, workspaceId);
        setMethods(methodList);
        setLoadingState('success');
      } catch (err) {
        console.error('Error loading methods:', err);
        setLoadingState('error');
      }
    };
    
    fetchMethods();
  }, [serverId]);
  
  // Function to refresh methods
  const handleRefreshMethods = async () => {
    setLoadingState('loading');
    try {
      // Fetch directly from API to avoid any store-based side effects
      const methodList = await api.tools.getServerMethods(serverId, workspaceId);
      setMethods(methodList);
      setLoadingState('success');
    } catch (err) {
      console.error('Error refreshing methods:', err);
      setLoadingState('error');
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
          <p className="text-gray-500 dark:text-gray-400">
            {loadingState === 'loading' ? 'Loading methods...' : 'No methods found for this server'}
          </p>
          {loadingState === 'error' && (
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleRefreshMethods}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
