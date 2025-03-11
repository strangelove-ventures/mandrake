'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Save } from 'lucide-react';
import { ServerEditState } from './types';
import { useState, useEffect } from 'react';

interface ServerEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingServer: ServerEditState | null;
  onSave: (editingServer: ServerEditState) => Promise<void>;
}

/**
 * Dialog for editing server configuration
 */
export default function ServerEditor({ isOpen, onClose, editingServer, onSave }: ServerEditorProps) {
  const [localEditState, setLocalEditState] = useState<ServerEditState | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState<string>('');
  
  // Update local state when the editingServer changes
  useEffect(() => {
    setLocalEditState(editingServer);
  }, [editingServer]);
  
  // Update JSON when localEditState changes
  useEffect(() => {
    if (localEditState) {
      setConfigJson(JSON.stringify({
        command: localEditState.config.command,
        args: localEditState.config.args || []
      }, null, 2));
    }
  }, [localEditState]);
  
  // Can't edit if no server is selected
  if (!localEditState) {
    return null;
  }
  
  const parseServerConfig = (json: string): Record<string, any> => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(json);
      return parsed;
    } catch (error) {
      setJsonError(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  };
  
  // Handle saving changes
  const handleSave = async () => {
    if (localEditState) {
      try {
        const updatedConfig = parseServerConfig(configJson);
        if (jsonError) return;
        
        await onSave({
          ...localEditState,
          config: {
            ...localEditState.config,
            command: updatedConfig.command || '',
            args: Array.isArray(updatedConfig.args) ? updatedConfig.args : [],
            disabled: localEditState.config.disabled
          }
        });
      } catch (error) {
        console.error('Error saving server configuration:', error);
      }
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-4">
        <DialogHeader>
          <DialogTitle>Edit Server Configuration</DialogTitle>
          <DialogDescription>
            Edit {localEditState.serverId} server in {localEditState.configId} configuration
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-3">
            <label htmlFor="edit-server-config" className="text-sm font-medium">Server Configuration</label>
            <div>
              <textarea
                id="edit-server-config"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="w-full p-3 border rounded-md h-48 font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder='{"command": "ripper-server", "args": ["--transport=stdio"]}'
              />
              {jsonError && (
                <p className="text-sm text-red-500 mt-1">
                  {jsonError}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <div className="flex items-center">
              <Checkbox 
                id="edit-disabled"
                checked={localEditState.config.disabled || false}
                onCheckedChange={(checked) => setLocalEditState({
                  ...localEditState,
                  config: { 
                    ...localEditState.config, 
                    disabled: checked === true 
                  }
                })}
              />
              <label htmlFor="edit-disabled" className="ml-2">
                Disable this server
              </label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <div className="flex gap-3">
            <div
              className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </div>
            <div
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer flex items-center"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
