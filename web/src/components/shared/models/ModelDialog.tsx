'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderConfig } from './types';
import { getProviderModels } from '@mandrake/utils';

interface ModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Record<string, ProviderConfig>;
  selectedProviderId: string;
  modelId: string;
  onSelectProvider: (providerId: string) => void;
  onChangeModelId: (modelId: string) => void;
  onAddModel: () => Promise<void>;
}

/**
 * Dialog for adding a new model
 */
export default function ModelDialog({
  isOpen,
  onClose,
  providers,
  selectedProviderId,
  modelId,
  onSelectProvider,
  onChangeModelId,
  onAddModel
}: ModelDialogProps) {
  // Get available models for the selected provider
  const providerType = selectedProviderId ? providers[selectedProviderId]?.type as any : null;
  const availableModels = providerType ? getProviderModels(providerType) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-4">
        <DialogHeader>
          <DialogTitle>Add New Model</DialogTitle>
          <DialogDescription>
            Configure a new model to use with Mandrake
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="provider-select" className="text-sm font-medium">Select Provider</label>
            <Select
              value={selectedProviderId}
              onValueChange={onSelectProvider}
            >
              <SelectTrigger id="provider-select" className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(providers).map(([id, provider]) => (
                  <SelectItem key={id} value={id}>{id} ({provider.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="model-select" className="text-sm font-medium">Select Model</label>
            <Select
              value={modelId}
              onValueChange={onChangeModelId}
            >
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((id) => (
                  <SelectItem key={id} value={id}>{id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <div 
            className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </div>
          <div
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer flex items-center"
            onClick={onAddModel}
          >
            Add Model
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
