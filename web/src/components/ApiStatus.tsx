/**
 * Component to display API status
 */
'use client';

import { useApiStatus } from '@/hooks/api';

export default function ApiStatus() {
  const status = useApiStatus();
  
  // Status indicator styles based on current state
  let statusStyles = 'inline-block w-2 h-2 rounded-full mr-2';
  statusStyles += status.status === 'online' 
    ? ' bg-green-500' 
    : status.status === 'offline' 
      ? ' bg-red-500' 
      : ' bg-yellow-500 animate-pulse';
  
  return (
    <div className="text-sm mb-4">
      <div className="flex items-center mb-1">
        <span className={statusStyles}></span>
        <span>
          {status.status === 'online' 
            ? 'API is online' 
            : status.status === 'offline' 
              ? 'API is offline' 
              : 'Checking API status...'}
        </span>
      </div>
      
      {status.status === 'offline' && (
        <div className="mt-1 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded text-sm">
          The API is currently offline. Make sure to run both the API and frontend with{' '}
          <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">bun run dev</code>{' '}
          from the project root.
        </div>
      )}
    </div>
  );
}