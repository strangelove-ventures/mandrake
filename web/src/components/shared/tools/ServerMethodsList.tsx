'use client';

import { useEffect, useState } from 'react';
import { useToolsStore } from '@/stores/system/tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

interface ServerMethodsListProps {
  serverId: string;
  onSelectMethod: (methodName: string) => void;
}

export default function ServerMethodsList({ serverId, onSelectMethod }: ServerMethodsListProps) {
  const { serverMethods, loadServerMethods, isLoading, error } = useToolsStore();
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  
  // Load methods for the server
  useEffect(() => {
    const fetchMethods = async () => {
      setLoadingState('loading');
      try {
        await loadServerMethods(serverId);
        setLoadingState('success');
      } catch {
        setLoadingState('error');
      }
    };
    
    // Only fetch if we don't already have methods for this server
    if (!serverMethods[serverId]) {
      fetchMethods();
    } else {
      setLoadingState('success');
    }
  }, [serverId, loadServerMethods, serverMethods]);
  
  // Get methods for the selected server
  const methods = serverMethods[serverId] || [];
  
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
  
  // If error, show error state
  if (loadingState === 'error' || error) {
    return (
      <div className="text-center p-4">
        <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Error loading methods</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Failed to load methods for server: {serverId}
        </p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => loadServerMethods(serverId)}
        >
          Retry
        </button>
      </div>
    );
  }
  
  // If no methods, show empty state
  if (methods.length === 0 && loadingState === 'success') {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">
          No methods found for this server. The server might not be running or doesn't expose any methods.
        </p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => loadServerMethods(serverId)}
        >
          Refresh
        </button>
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Methods</CardTitle>
        <CardDescription>
          Methods exposed by the {serverId} server
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {methods.map(method => (
            <li 
              key={method.name}
              className="p-3 border rounded-md flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={(e) => {
                // Stop event propagation to prevent modal from closing
                e.stopPropagation();
                onSelectMethod(method.name);
              }}
            >
              <div>
                <div className="font-medium">{method.name}</div>
                {method.description && (
                  <div className="text-sm text-gray-500">{method.description}</div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
