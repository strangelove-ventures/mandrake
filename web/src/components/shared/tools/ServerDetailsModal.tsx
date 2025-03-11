'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Server, 
  Code, 
  Play, 
  RefreshCw 
} from 'lucide-react';
import { ServerConfig } from './types';
import { useToolsStore } from '@/stores/system/tools';
import { useServerStatus } from '@/hooks/useServerStatus';
import { dynamic } from '@/lib/api/resources/dynamic';
import ServerMethodsList from './ServerMethodsList';
import MethodExecutionPanel from './MethodExecutionPanel';
import ServerConfigDisplay from './ServerConfigDisplay';
import ServerStatusIndicator from './ServerStatusIndicator';

interface ServerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  config: ServerConfig;
  onEdit: () => void;
  isWorkspace?: boolean;
  workspaceId?: string;
}

export default function ServerDetailsModal({
  isOpen,
  onClose,
  serverId,
  config,
  onEdit,
  isWorkspace,
  workspaceId
}: ServerDetailsModalProps) {
  const { selectMethod } = useToolsStore();
  const { serverStatus, loadServerStatus } = useServerStatus(workspaceId);

  const [isAddingToDynamic, setIsAddingToDynamic] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('config');
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Load status immediately when modal opens
      loadServerStatus().catch(err => {
        console.error('Error loading server status in modal:', err);
      });
    }
  }, [isOpen, loadServerStatus]);
  
  const status = serverStatus[serverId] || { status: 'unknown' };
  
  // Handle method selection
  const handleSelectMethod = (methodName: string) => {
    setSelectedMethodName(methodName);
    selectMethod(serverId, methodName);
    setActiveTab('method');
  };
  
  // Add to dynamic context handler
  const handleAddToDynamicContext = async () => {
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
      onClose();
    } catch (err) {
      console.error('Failed to add to dynamic context:', err);
      alert(`Failed to add to dynamic context: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAddingToDynamic(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <DialogTitle className="text-xl">{serverId} Server</DialogTitle>
              
              {/* Status indicator */}
              <div className="flex items-center space-x-2">
                <ServerStatusIndicator 
                  status={status?.status || 'unknown'} 
                  disabled={config.disabled}
                  className="h-4 w-4"
                />
                <Badge
                  variant={status?.status === 'running' ? 'default' : 
                         status?.status === 'stopped' ? 'secondary' :
                         status?.status === 'disabled' ? 'outline' : 'destructive'}
                >
                  {status?.status 
                    ? status.status.charAt(0).toUpperCase() + status.status.slice(1) 
                    : 'Unknown'}
                </Badge>
              </div>
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
                  onClick={handleAddToDynamicContext}
                  disabled={isAddingToDynamic}
                >
                  {isAddingToDynamic ? 'Adding...' : 'Add to Dynamic Context'}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
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
            <ServerConfigDisplay
              serverId={serverId}
              config={config}
              status={status}
            />
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
      </DialogContent>
    </Dialog>
  );
}
