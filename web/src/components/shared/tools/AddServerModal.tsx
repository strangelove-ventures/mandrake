/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (serverId: string, config: any) => Promise<void>;
}

export default function AddServerModal({
  isOpen,
  onClose,
  onAdd
}: AddServerModalProps) {
  const [serverId, setServerId] = useState('');
  const [configJson, setConfigJson] = useState(JSON.stringify({
    command: "ripper-server",
    args: ["--transport=stdio", "--excludePatterns=\\.ws"]
  }, null, 2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!serverId.trim()) {
      setError('Server ID is required');
      return;
    }
    
    try {
      setError(null);
      setIsSubmitting(true);
      
      // Parse the config JSON
      const config = JSON.parse(configJson);
      
      if (!config.command) {
        throw new Error('Server configuration must have a "command" property');
      }
      
      await onAdd(serverId, config);
      
      // Reset form and close
      setServerId('');
      setConfigJson(JSON.stringify({
        command: "ripper-server",
        args: ["--transport=stdio", "--excludePatterns=\\.ws"]
      }, null, 2));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid server configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Server
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Server</DialogTitle>
          <DialogDescription>
            Add a new server configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="serverId" className="text-sm font-medium">Server ID</label>
            <Input
              id="serverId"
              value={serverId}
              onChange={(e) => setServerId(e.target.value.replace(/\s+/g, ''))}
              className="w-full"
              placeholder="e.g., ripper, fetch, search (no spaces)"
            />
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="serverConfig" className="text-sm font-medium">Configuration</label>
            <textarea
              id="serverConfig"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="w-full p-3 border rounded-md h-64 font-mono text-sm"
              placeholder='{"command": "ripper-server", "args": ["--transport=stdio", "--excludePatterns=\\.ws"]}'
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-500 mt-2">
              {error}
            </div>
          )}
          
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              The configuration should be a valid JSON object with at least a "command" property
              and optionally "args" (array of strings), "env" (object), and "autoApprove" (array of strings).
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Server'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
