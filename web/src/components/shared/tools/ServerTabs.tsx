'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ToolConfig } from './types';
import { useToolsStore } from '@/stores/system/tools';
import { useServerStatus } from '@/hooks/useServerStatus';
import ServerDetailsModal from './ServerDetailsModal';
import ServerListItem from './ServerListItem';
import AddServerModal from './AddServerModal';

interface ServerTabsProps {
  config: ToolConfig;
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
  onEditServer: (serverId: string) => void;
  onToggleServerDisabled: (serverId: string) => void;
  onAddServer: () => Promise<void>;
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
  const { loadServerStatus } = useToolsStore();
  const { serverStatus } = useServerStatus(workspaceId);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadServerStatus()}
          title="Refresh server status"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh Status
        </Button>
        
        <AddServerModal
          isOpen={isCreatingServer}
          onClose={() => setIsCreatingServer(false)}
          onAdd={async (serverId, serverConfig) => {
            setNewServerId(serverId);
            setServerConfigJson(JSON.stringify(serverConfig, null, 2));
            await onAddServer();
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
                onEdit={() => onEditServer(serverId)}
                onViewDetails={() => {
                  onSelectServer(serverId);
                  setIsDetailsModalOpen(true);
                }}
                onToggleDisabled={() => onToggleServerDisabled(serverId)}
                onDelete={() => {
                  if (confirm(`Are you sure you want to delete the ${serverId} server?`)) {
                    // Would call actual delete function here
                    alert('Delete server functionality coming soon');
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
          onEdit={() => onEditServer(selectedServerId)}
          isWorkspace={isWorkspace}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
