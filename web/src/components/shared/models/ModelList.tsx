'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { ModelConfig, ProviderConfig } from './types';

interface ModelListProps {
  models: Record<string, ModelConfig>;
  providers: Record<string, ProviderConfig>;
  activeModelId: string;
  selectedModelId: string | null;
  onSelectModel: (modelId: string) => void;
  onEditModel: (modelId: string) => void;
  onToggleModelEnabled: (modelId: string) => void;
  onSetActiveModel: (modelId: string) => void;
  onAddModel: () => void;
}

/**
 * Displays the list of configured models
 */
export default function ModelList({
  models,
  providers,
  activeModelId,
  selectedModelId,
  onSelectModel,
  onEditModel,
  onToggleModelEnabled,
  onSetActiveModel,
  onAddModel
}: ModelListProps) {
  const modelIds = Object.keys(models);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddModel}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Model
        </Button>
      </div>
      
      {modelIds.length === 0 ? (
        <div className="text-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No models configured. Add a model to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {modelIds.map(modelId => {
            const model = models[modelId];
            const provider = providers[model.providerId];
            const isDisabled = !model.enabled;
            const isActive = modelId === activeModelId;
            
            return (
              <li 
                key={modelId} 
                className={`p-3 border rounded-md flex justify-between items-center 
                  ${selectedModelId === modelId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} 
                  ${isDisabled ? 'opacity-60' : ''}`}
                onClick={() => !isDisabled && onSelectModel(modelId)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${isDisabled ? 'bg-gray-400' : 'bg-green-500'}`} 
                    title={isDisabled ? 'Disabled' : 'Enabled'} 
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{modelId}</span>
                      {isActive && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Provider: {model.providerId} {model.config.temperature && `• Temp: ${model.config.temperature}`} {model.config.maxTokens && `• Max Tokens: ${model.config.maxTokens}`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Set as active button */}
                  {!isActive && (
                    <div 
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer text-blue-500" 
                      title="Set as active model"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetActiveModel(modelId);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                  )}
                  
                  {/* Edit button */}
                  <div 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" 
                    title="Edit model"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditModel(modelId);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                  </div>
                  
                  {/* Enable/disable toggle */}
                  <div 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    title={isDisabled ? "Enable model" : "Disable model"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleModelEnabled(modelId);
                    }}
                  >
                    {isDisabled ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-500"><path d="M18.36 6.64A9 9 0 0 1 20.77 15"></path><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"></path><path d="M12 2v4"></path><path d="m2 2 20 20"></path></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-500"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path></svg>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
