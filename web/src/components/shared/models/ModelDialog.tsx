'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { ProviderConfig } from './types';

interface ModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  providerId: string;
  providers: Record<string, ProviderConfig>;
  onAddModel: () => void;
  setModelId: (id: string) => void;
  setProviderId: (id: string) => void;
}

/**
 * Dialog for creating a new model
 */
export default function ModelDialog({
  isOpen,
  onClose,
  modelId,
  providerId,
  providers,
  onAddModel,
  setModelId,
  setProviderId
}: ModelDialogProps) {
  const [error, setError] = useState<string | null>(null);
  
  const handleSave = () => {
    // Basic validation
    if (!modelId) {
      setError('Model ID is required');
      return;
    }
    
    if (!providerId) {
      setError('Provider selection is required');
      return;
    }
    
    // Validate ID format (letters, numbers, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(modelId)) {
      setError('Model ID can only contain letters, numbers, hyphens, and underscores');
      return;
    }
    
    onAddModel();
  };
  
  // Filter out any disabled providers
  const availableProviders = Object.entries(providers)
    .filter(([_, config]) => !config.disabled)
    .reduce((acc, [id, config]) => {
      acc[id] = config;
      return acc;
    }, {} as Record<string, ProviderConfig>);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-4">
        <DialogHeader>
          <DialogTitle>Add Model</DialogTitle>
          <DialogDescription>
            Configure a new model for use in your system
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="modelId" className="text-sm font-medium">Model ID</label>
            <Input
              id="modelId"
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
                setError(null); // Clear error when user types
              }}
              placeholder="claude-3-haiku-20240307"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Unique identifier for this model
            </p>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="providerId" className="text-sm font-medium">Provider</label>
            <Select
              value={providerId}
              onValueChange={(value) => setProviderId(value)}
            >
              <SelectTrigger id="providerId" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(availableProviders).length === 0 ? (
                  <SelectItem value="" disabled>No providers available</SelectItem>
                ) : (
                  Object.entries(availableProviders).map(([id, config]) => (
                    <SelectItem key={id} value={id}>
                      {id} ({config.type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Provider that will be used for this model
            </p>
            
            {Object.keys(availableProviders).length === 0 && (
              <p className="text-xs text-amber-500 mt-2">
                No enabled providers. Please add and enable a provider first.
              </p>
            )}
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
          <Button 
            onClick={handleSave} 
            disabled={Object.keys(availableProviders).length === 0}
          >
            Add Model
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
