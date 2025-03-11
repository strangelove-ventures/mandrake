'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderEditState, ProviderType } from './types';

interface ProviderEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingProvider: ProviderEditState | null;
  onSave: (providerEdit: ProviderEditState) => Promise<void>;
}

/**
 * Dialog for editing provider configuration
 */
export default function ProviderEditor({ 
  isOpen, 
  onClose, 
  editingProvider, 
  onSave 
}: ProviderEditorProps) {
  const [localEditState, setLocalEditState] = useState<ProviderEditState | null>(null);
  
  // Update local state when the editingProvider changes
  useEffect(() => {
    setLocalEditState(editingProvider);
  }, [editingProvider]);
  
  // Can't edit if no provider is selected
  if (!localEditState) {
    return null;
  }
  
  // Handle saving changes
  const handleSave = async () => {
    if (localEditState) {
      await onSave(localEditState);
    }
  };
  
  // Different providers have different configuration options
  const renderProviderFields = () => {
    const { config } = localEditState;
    
    switch (config.type) {
      case 'anthropic':
      case 'xai':
        return (
          <>
            <div className="flex flex-col gap-2 mt-4">
              <label htmlFor="apiKey" className="text-sm font-medium">API Key</label>
              <Input
                id="apiKey"
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => setLocalEditState({
                  ...localEditState,
                  config: { ...config, apiKey: e.target.value }
                })}
                className="w-full"
                placeholder="Enter API key"
              />
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              <label htmlFor="baseUrl" className="text-sm font-medium">Base URL (Optional)</label>
              <Input
                id="baseUrl"
                value={config.baseUrl || ''}
                onChange={(e) => setLocalEditState({
                  ...localEditState,
                  config: { ...config, baseUrl: e.target.value }
                })}
                className="w-full"
                placeholder="https://api.anthropic.com"
              />
              <p className="text-xs text-gray-500">
                Leave blank to use the default API endpoint
              </p>
            </div>
          </>
        );
      
      case 'ollama':
        return (
          <div className="flex flex-col gap-2 mt-4">
            <label htmlFor="baseUrl" className="text-sm font-medium">Base URL</label>
            <Input
              id="baseUrl"
              value={config.baseUrl || ''}
              onChange={(e) => setLocalEditState({
                ...localEditState,
                config: { ...config, baseUrl: e.target.value }
              })}
              className="w-full"
              placeholder="http://localhost:11434"
            />
            <p className="text-xs text-gray-500">
              Local Ollama server endpoint (default: http://localhost:11434)
            </p>
          </div>
        );
      
      default:
        return (
          <div className="p-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md mt-4">
            Unknown provider type: {config.type}
          </div>
        );
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-4">
        <DialogHeader>
          <DialogTitle>Edit Provider Configuration</DialogTitle>
          <DialogDescription>
            Configure settings for {localEditState.providerId} provider
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="provider-type" className="text-sm font-medium">Provider Type</label>
            <Select
              value={localEditState.config.type}
              onValueChange={(value) => setLocalEditState({
                ...localEditState,
                config: { ...localEditState.config, type: value as ProviderType }
              })}
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
          </div>
          
          {renderProviderFields()}
          
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="disabled"
              checked={localEditState.config.disabled || false}
              onCheckedChange={(checked) => setLocalEditState({
                ...localEditState,
                config: { 
                  ...localEditState.config, 
                  disabled: checked === true 
                }
              })}
            />
            <label 
              htmlFor="disabled"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Disable this provider
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
