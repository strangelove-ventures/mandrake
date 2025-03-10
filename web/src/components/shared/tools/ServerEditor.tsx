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
  
  // Update local state when the editingServer changes
  useEffect(() => {
    setLocalEditState(editingServer);
  }, [editingServer]);
  
  // Can't edit if no server is selected
  if (!localEditState) {
    return null;
  }
  
  // Parse JSON from editor
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState<string>('');
  
  useEffect(() => {
    if (localEditState) {
      setConfigJson(JSON.stringify({
        command: localEditState.config.command,
        args: localEditState.config.args || []
      }, null, 2));
    }
  }, [localEditState]);
  
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Server Configuration</DialogTitle>
          <DialogDescription>
            Edit {localEditState.serverId} server in {localEditState.configId} configuration
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-start gap-4">
            <label htmlFor="edit-server-config" className="text-right pt-2">Configuration</label>
            <div className="col-span-3">
              <textarea
                id="edit-server-config"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="w-full p-3 border rounded-md h-64 font-mono text-sm"
                placeholder='{"command": "ripper-server", "args": ["--transport=stdio"]}'
              />
              {jsonError && (
                <p className="text-sm text-red-500 mt-1">
                  {jsonError}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right">Disabled</div>
            <div className="col-span-3 flex items-center">
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
