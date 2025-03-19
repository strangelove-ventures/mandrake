'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { ToolConfig, ServerConfig } from './types';
import { useToolsStore } from '@/stores/system/tools';
import { useServerStatus } from '@/hooks/useServerStatus';
import ServerListItem from './ServerListItem';
import AddServerModal from './AddServerModal';
import MethodsModal from './MethodsModal';
import ServerEditModal from './ServerEditModal';
import ServerDetailsModal from './ServerDetailsModal';

interface ServerTabsProps {
  config: ToolConfig;
  selectedServerId: string | null;
  configId: string;
  onSelectServer: (serverId: string) => void;
  onEditServer: (serverId: string) => void;
  onToggleServerDisabled: (serverId: string) => void;
  onAddServer: (serverId: string, config: ServerConfig) => Promise<void>;
  isCreatingServer: boolean;
  setIsCreatingServer: (isCreating: boolean) => void;
  newServerId: string;
  setNewServerId: (serverId: string) => void;
  newServerCommand: string;
  setNewServerCommand: (command: string) => void;
  serverConfigJson: string;
  setServerConfigJson: (json: string) => void;
  isWorkspace?: boolean;
  workspaceId?: string;
}

/**
 * Displays a simplified server list with actions
 */
export default function ServerTabs({
  config,
  selectedServerId,
  configId,
  onSelectServer,
  onEditServer,
  onToggleServerDisabled,
  onAddServer,
  isCreatingServer,
  setIsCreatingServer,
  newServerId,
  setNewServerId,
  newServerCommand,
  setNewServerCommand,
  serverConfigJson,
  setServerConfigJson,
  isWorkspace,
  workspaceId
}: ServerTabsProps) {
  const serverIds = Object.keys(config);
  const selectedServer = selectedServerId && config[selectedServerId];
  const { loadServerStatus, updateToolConfig, startServer, stopServer } = useToolsStore();
  const { serverStatus } = useServerStatus(workspaceId);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('Refreshing server status...');
            loadServerStatus(workspaceId);
          }}
          title="Refresh server status"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh Status
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreatingServer(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Server
        </Button>
        
        <AddServerModal
          isOpen={isCreatingServer}
          onClose={() => setIsCreatingServer(false)}
          onAdd={async (serverId, serverConfig) => {
            console.log('Adding server from modal:', serverId, serverConfig);
            // Directly call the onAddServer with the values from the modal
            try {
              await onAddServer(serverId, serverConfig);
              // Clear form values
              setNewServerId('');
              setServerConfigJson('');
            } catch (error) {
              console.error('Error adding server from modal:', error);
            }
          }}
        />
      </div>
      
      {/* Server List */}
      {serverIds.length > 0 ? (
        <div>
          <ul className="space-y-2">
            {serverIds.map(serverId => (
              <ServerListItem
                key={serverId}
                serverId={serverId}
                config={config[serverId]}
                status={serverStatus[serverId]}
                isSelected={selectedServerId === serverId}
                onSelect={() => {
                  onSelectServer(serverId);
                  setIsDetailsModalOpen(true);
                }}
                onEdit={() => {
                  onSelectServer(serverId);
                  setIsEditModalOpen(true);
                }}
                onToggleDisabled={() => onToggleServerDisabled(serverId)}
                onDelete={() => {
                  if (confirm(`Are you sure you want to delete the ${serverId} server?`)) {
                    // Would call actual delete function here
                    alert('Delete server functionality coming soon');
                  }
                }}
                onStart={() => {
                  const serverConfig = config[serverId];
                  if (serverConfig) {
                    try {
                      startServer(serverId, serverConfig, workspaceId);
                    } catch (error) {
                      console.error(`Failed to start server ${serverId}:`, error);
                    }
                  }
                }}
                onStop={() => {
                  try {
                    stopServer(serverId, workspaceId);
                  } catch (error) {
                    console.error(`Failed to stop server ${serverId}:`, error);
                  }
                }}
              />
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No servers found in this configuration. Add a new server to get started.
          </p>
        </div>
      )}
      
      {/* Server details modal */}
      {selectedServer && (
        <ServerDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          serverId={selectedServerId}
          config={selectedServer}
          onEdit={() => setIsEditModalOpen(true)}
          isWorkspace={isWorkspace}
          workspaceId={workspaceId}
        />
      )}
      
      {/* Edit server modal */}
      {selectedServer && (
        <ServerEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          serverId={selectedServerId}
          config={selectedServer}
          onSave={async (serverId, updatedConfig) => {
            // Call the original edit handler with the updated config
            const updatedConfigSet = { ...config };
            updatedConfigSet[serverId] = updatedConfig;
            await updateToolConfig(configId, updatedConfigSet, workspaceId);
          }}
        />
      )}
    </div>
  );
}