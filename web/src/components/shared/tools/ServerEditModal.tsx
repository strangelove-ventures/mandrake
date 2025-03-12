'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ServerConfig } from './types';
import StableModal from './StableModal';

interface ServerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  config: ServerConfig;
  onSave: (serverId: string, config: ServerConfig) => Promise<void>;
}

export default function ServerEditModal({
  isOpen,
  onClose,
  serverId,
  config,
  onSave
}: ServerEditModalProps) {
  const [configJson, setConfigJson] = useState(() => 
    JSON.stringify({
      command: config.command,
      args: config.args || [],
      env: config.env || {},
      disabled: config.disabled || false
    }, null, 2)
  );
  
  const [isDisabled, setIsDisabled] = useState(Boolean(config.disabled));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSave = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      
      // Parse the JSON configuration
      const parsedConfig = JSON.parse(configJson);
      
      // Make sure it has the required fields
      if (!parsedConfig.command) {
        throw new Error('Configuration must include a "command" field');
      }
      
      // Add the disabled state
      parsedConfig.disabled = isDisabled;
      
      // Call the save handler
      await onSave(serverId, parsedConfig);
      
      onClose();
    } catch (err) {
      console.error('Error saving server configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to save server configuration');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <StableModal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Edit Server Configuration</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Edit the configuration for the {serverId} server
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="configJson">Configuration (JSON)</Label>
            <Textarea
              id="configJson"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="font-mono"
              rows={12}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Server configuration must include a "command" field, and can optionally include "args" (array), "env" (object), and "autoApprove" (array).
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="disabled"
              checked={!isDisabled}
              onCheckedChange={(checked) => setIsDisabled(!checked)}
            />
            <Label htmlFor="disabled" className="cursor-pointer">
              {isDisabled ? 'Server is disabled' : 'Server is enabled'}
            </Label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </StableModal>
  );
}
