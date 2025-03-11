'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Save } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelEditState, ProviderConfig, ProviderType } from './types';
import { PROVIDER_MODELS, getProviderModels } from '@mandrake/utils';

interface ModelEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingModel: ModelEditState | null;
  providers: Record<string, ProviderConfig>;
  onSave: (modelEdit: ModelEditState) => Promise<void>;
}

/**
 * Dialog for editing model configuration
 */
export default function ModelEditor({ 
  isOpen, 
  onClose, 
  editingModel,
  providers,
  onSave 
}: ModelEditorProps) {
  const [localEditState, setLocalEditState] = useState<ModelEditState | null>(null);
  
  // Update local state when the editingModel changes
  useEffect(() => {
    setLocalEditState(editingModel);
  }, [editingModel]);
  
  // Can't edit if no model is selected
  if (!localEditState) {
    return null;
  }
  
  // Get available models for the selected provider
  const availableModels = localEditState.config.providerId 
    ? getProviderModels(providers[localEditState.config.providerId]?.type as ProviderType) 
    : [];
  
  // Handle saving changes
  const handleSave = async () => {
    if (localEditState) {
      await onSave(localEditState);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-4">
        <DialogHeader>
          <DialogTitle>Edit Model Configuration</DialogTitle>
          <DialogDescription>
            Configure settings for {localEditState.modelId} model
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="provider-select" className="text-sm font-medium">Provider</label>
            <Select
              value={localEditState.config.providerId}
              onValueChange={(value) => setLocalEditState({
                ...localEditState,
                config: { 
                  ...localEditState.config, 
                  providerId: value,
                  // Reset model ID when provider changes
                  modelId: ''
                }
              })}
            >
              <SelectTrigger id="provider-select" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(providers).map(([id, provider]) => (
                  <SelectItem key={id} value={id}>{id} ({provider.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="model-select" className="text-sm font-medium">Model</label>
            <Select
              value={localEditState.config.modelId}
              onValueChange={(value) => setLocalEditState({
                ...localEditState,
                config: { ...localEditState.config, modelId: value }
              })}
            >
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((modelId) => (
                  <SelectItem key={modelId} value={modelId}>{modelId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label className="text-sm font-medium">Temperature: {localEditState.config.config.temperature || 0.7}</label>
            <Slider
              value={[localEditState.config.config.temperature || 0.7]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={(value) => setLocalEditState({
                ...localEditState,
                config: { 
                  ...localEditState.config, 
                  config: {
                    ...localEditState.config.config,
                    temperature: value[0]
                  }
                }
              })}
            />
            <p className="text-xs text-gray-500">
              Lower values (0.0) make responses more deterministic, higher values (1.0) make responses more creative
            </p>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="max-tokens" className="text-sm font-medium">Maximum Tokens</label>
            <Input
              id="max-tokens"
              type="number"
              min={1}
              value={localEditState.config.config.maxTokens || 4096}
              onChange={(e) => setLocalEditState({
                ...localEditState,
                config: { 
                  ...localEditState.config, 
                  config: {
                    ...localEditState.config.config,
                    maxTokens: parseInt(e.target.value) || 4096
                  }
                }
              })}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Maximum number of tokens allowed in the model's response
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="enabled"
              checked={localEditState.config.enabled}
              onCheckedChange={(checked) => setLocalEditState({
                ...localEditState,
                config: { 
                  ...localEditState.config, 
                  enabled: checked === true 
                }
              })}
            />
            <label 
              htmlFor="enabled"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Enable this model
            </label>
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
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
