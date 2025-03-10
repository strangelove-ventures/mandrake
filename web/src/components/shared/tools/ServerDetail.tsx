'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit } from 'lucide-react';
import { ServerConfig } from './types';

interface ServerDetailProps {
  serverId: string;
  config: ServerConfig;
  onEdit: () => void;
}

/**
 * Displays the details of a server configuration
 */
export default function ServerDetail({ serverId, config, onEdit }: ServerDetailProps) {
  // Format the config object as JSON for display
  const configJson = JSON.stringify({
    command: config.command,
    args: config.args || []
  }, null, 2);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium">{serverId} Server</h4>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
      
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
    </div>
  );
}
