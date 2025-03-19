/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Play, Square } from 'lucide-react';
import { ServerConfig } from './types';
import ServerStatusIndicator from './ServerStatusIndicator';

interface ServerListItemProps {
  serverId: string;
  config: ServerConfig;
  status?: { status: string; state?: any; error?: string; };
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleDisabled: () => void;
  onDelete: () => void;
  onStart?: () => void;
  onStop?: () => void;
}

export default function ServerListItem({
  serverId,
  config,
  status,
  isSelected,
  onSelect,
  onEdit,
  onToggleDisabled,
  onDelete,
  onStart,
  onStop
}: ServerListItemProps) {
  return (
    <li className={`p-3 border rounded-md flex justify-between items-center 
      ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} 
      ${config.disabled ? 'opacity-60' : ''}`}
    >
      {/* Main content area (clickable) */}
      <div 
        className="flex-grow flex items-center space-x-3 cursor-pointer" 
        onClick={() => {
          if (!config.disabled) {
            onSelect();
          }
        }}
      >
        <ServerStatusIndicator 
          status={status?.status || 'unknown'} 
          disabled={config.disabled}
        />
        <span className="font-medium">{serverId}</span>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        {/* Start/Stop buttons */}
        {!config.disabled && (
          <>
            {status?.status === 'running' || status?.status === 'started' ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-red-500"
                title="Stop server"
                onClick={(e) => {
                  e.stopPropagation();
                  onStop && onStop();
                }}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-green-500"
                title="Start server"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart && onStart();
                }}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        
        {/* Enable/disable switch */}
        <div className="pr-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={!config.disabled}
            onCheckedChange={() => onToggleDisabled()}
            aria-label={config.disabled ? "Enable server" : "Disable server"}
          />
        </div>
        
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
