'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ServerConfig } from './types';

interface ServerConfigDisplayProps {
  serverId: string;
  config: ServerConfig;
  status?: { status: string; state?: any; error?: string; logs?: string[]; };
}

export default function ServerConfigDisplay({
  serverId,
  config,
  status
}: ServerConfigDisplayProps) {
  // Format the config object as JSON for display
  const configJson = JSON.stringify({
    command: config.command,
    args: config.args || []
  }, null, 2);
  
  return (
    <div className="space-y-4">
      <div>
        <h5 className="text-sm font-medium mb-1">Server Configuration</h5>
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono">
          <pre className="text-sm whitespace-pre-wrap overflow-auto">
            {configJson}
          </pre>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id={`disabled-${serverId}`}
          checked={config.disabled}
          disabled
        />
        <label htmlFor={`disabled-${serverId}`}>
          Server is disabled
        </label>
      </div>
      
      {/* Show logs if available in status */}
      {status?.logs && status.logs.length > 0 && (
        <div className="mt-4">
          <h5 className="text-sm font-medium mb-1">Server Logs</h5>
          <div className="bg-black text-green-400 p-3 rounded font-mono h-40 overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {status.logs.join('\n')}
            </pre>
          </div>
        </div>
      )}
      
      {/* Show error if available */}
      {status?.error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            {status.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
