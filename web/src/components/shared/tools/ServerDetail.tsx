'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Server, Code, Play, RefreshCw } from 'lucide-react';
import { ServerConfig } from './types';
import { useToolsStore } from '@/stores/system/tools';
import { dynamic } from '@/lib/api/resources/dynamic';
import ServerMethodsList from './ServerMethodsList';
import MethodExecutionPanel from './MethodExecutionPanel';
import { Badge } from '@/components/ui/badge';

interface ServerDetailProps {
  serverId: string;
  config: ServerConfig;
  onEdit: () => void;
  isWorkspace?: boolean;
}

/**
 * Displays the details of a server configuration
 */
export default function ServerDetail({ serverId, config, onEdit, isWorkspace }: ServerDetailProps) {
  // Format the config object as JSON for display
  const configJson = JSON.stringify({
    command: config.command,
    args: config.args || []
  }, null, 2);
  
  const { serverStatus, loadServerStatus, selectedMethod, selectMethod, activeToolsId } = useToolsStore();
  const [isAddingToDynamic, setIsAddingToDynamic] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('config');
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);
  
  // Load server status when component mounts
  useEffect(() => {
    loadServerStatus();
    const interval = setInterval(loadServerStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [loadServerStatus]);
  
  // Get status for this server
  const status = serverStatus[serverId] || { status: 'unknown' };
  
  // Handle method selection
  const handleSelectMethod = (methodName: string) => {
    setSelectedMethodName(methodName);
    selectMethod(serverId, methodName);
    setActiveTab('method');
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h4 className="text-lg font-medium">{serverId} Server</h4>
          
          {/* Status indicator */}
          <Badge
            variant={status.status === 'running' ? 'default' : 
                   status.status === 'stopped' ? 'secondary' :
                   status.status === 'disabled' ? 'outline' : 'destructive'}
            className="ml-2"
          >
            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
          </Badge>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadServerStatus()}
            title="Refresh server status"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          
          {/* Dynamic Context Button for workspace only */}
          {isWorkspace && (
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                try {
                  setIsAddingToDynamic(true);
                  if (!workspaceId) {
                    throw new Error('Workspace ID is required');
                  }
                  
                  // Create dynamic context configuration from tool server data
                  const dynamicContext = {
                    id: `tool-${serverId}`,
                    title: `${serverId.charAt(0).toUpperCase() + serverId.slice(1)} Tool`,
                    description: `Dynamic context for ${serverId} tool server`,
                    content: JSON.stringify({
                      toolServer: serverId,
                      config: config
                    }, null, 2),
                    enabled: true
                  };
                  
                  // Call the standard dynamic context creation endpoint
                  await dynamic.create(dynamicContext, workspaceId);
                  alert(`Successfully added ${serverId} to dynamic context`);
                } catch (err) {
                  console.error('Failed to add to dynamic context:', err);
                  alert(`Failed to add to dynamic context: ${err instanceof Error ? err.message : 'Unknown error'}`);
                } finally {
                  setIsAddingToDynamic(false);
                }
              }}
              disabled={isAddingToDynamic}
            >
              {isAddingToDynamic ? 'Adding...' : 'Add to Dynamic Context'}
            </Button>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="config" className="flex items-center">
            <Server className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="methods" className="flex items-center">
            <Code className="h-4 w-4 mr-2" />
            Methods
          </TabsTrigger>
          <TabsTrigger value="method" className="flex items-center" disabled={!selectedMethodName}>
            <Play className="h-4 w-4 mr-2" />
            Execute {selectedMethodName ? `'${selectedMethodName}'` : ''}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="mt-4">
          <div>
            <h5 className="text-sm font-medium mb-1">Server Configuration</h5>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono">
              <pre className="text-sm whitespace-pre-wrap overflow-auto">
                {configJson}
              </pre>
            </div>
          </div>
          
          <div className="mt-4 flex items-center space-x-2">
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
          {status.state?.logs && status.state.logs.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium mb-1">Server Logs</h5>
              <div className="bg-black text-green-400 p-3 rounded font-mono h-40 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {status.state.logs.join('\n')}
                </pre>
              </div>
            </div>
          )}
          
          {/* Show error if available */}
          {status.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                {status.error}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="methods" className="mt-4">
          <ServerMethodsList 
            serverId={serverId} 
            onSelectMethod={handleSelectMethod} 
          />
        </TabsContent>
        
        <TabsContent value="method" className="mt-4">
          {selectedMethodName ? (
            <MethodExecutionPanel 
              serverId={serverId} 
              methodName={selectedMethodName} 
            />
          ) : (
            <div className="text-center p-8 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">
                Select a method from the Methods tab to execute it.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
