'use client';

import { Button } from '@/components/ui/button';
import { Edit, Info, Power, Trash2 } from 'lucide-react';
import { ServerConfig } from './types';
import ServerStatusIndicator from './ServerStatusIndicator';

interface ServerListItemProps {
  serverId: string;
  config: ServerConfig;
  status?: { status: string; state?: any; error?: string; };
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onViewDetails: () => void;
  onToggleDisabled: () => void;
  onDelete: () => void;
}

export default function ServerListItem({
  serverId,
  config,
  status,
  isSelected,
  onSelect,
  onEdit,
  onViewDetails,
  onToggleDisabled,
  onDelete
}: ServerListItemProps) {
  return (
    <li 
      className={`p-3 border rounded-md flex justify-between items-center 
        ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} 
        ${config.disabled ? 'opacity-60' : ''}`}
      onClick={() => {
        if (!config.disabled) {
          onSelect();
        }
      }}
    >
      <div className="flex items-center space-x-3">
        <ServerStatusIndicator 
          status={status?.status || 'unknown'} 
          disabled={config.disabled}
        />
        <span className="font-medium">{serverId}</span>
      </div>
      <div className="flex items-center space-x-2">
        {/* Edit button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Edit server"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        {/* Details button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="View server details"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
        
        {/* Enable/disable toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={config.disabled ? "Enable server" : "Disable server"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDisabled();
          }}
        >
          <Power className={`h-4 w-4 ${config.disabled ? 'text-red-500' : 'text-green-500'}`} />
        </Button>
        
        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:text-red-500"
          title="Delete server"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
