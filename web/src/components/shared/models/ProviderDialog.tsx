'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ProviderType } from './types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface ProviderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerType: string;
  onAddProvider: () => void;
  setProviderId: (id: string) => void;
  setProviderType: (type: string) => void;
}

/**
 * Dialog for creating a new provider
 */
export default function ProviderDialog({
  isOpen,
  onClose,
  providerId,
  providerType,
  onAddProvider,
  setProviderId,
  setProviderType
}: ProviderDialogProps) {
  const [error, setError] = useState<string | null>(null);
  
  const handleSave = () => {
    // Basic validation
    if (!providerId) {
      setError('Provider ID is required');
      return;
    }
    
    // Validate ID format (letters, numbers, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(providerId)) {
      setError('Provider ID can only contain letters, numbers, hyphens, and underscores');
      return;
    }
    
    onAddProvider();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-4">
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
          <DialogDescription>
            Configure a new LLM provider
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="providerId" className="text-sm font-medium">Provider ID</label>
            <Input
              id="providerId"
              value={providerId}
              onChange={(e) => {
                setProviderId(e.target.value);
                setError(null); // Clear error when user types
              }}
              placeholder="anthropic-api"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Unique identifier for this provider
            </p>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="provider-type" className="text-sm font-medium">Provider Type</label>
            <Select
              value={providerType}
              onValueChange={(value) => setProviderType(value)}
            >
              <SelectTrigger id="provider-type" className="w-full">
                <SelectValue placeholder="Select provider type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
                <SelectItem value="xai">xAI</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Specific LLM provider implementation
            </p>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Add Provider
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
