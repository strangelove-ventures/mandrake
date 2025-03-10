'use client';

import { useState, useEffect } from 'react';
import { useModelsStore } from '@/stores';

interface Model {
  id: string;
  providerId: string;
  name: string;
  type: string;
  config: {
    enabled: boolean;
    providerId: string;
    modelId: string;
    config: {
      temperature?: number;
      maxTokens?: number;
    };
  };
}

export default function ModelsConfig() {
  const { 
    availableModels, 
    activeModelId, 
    loadModels, 
    loadActiveModel, 
    setActiveModel, 
    isLoading, 
    error 
  } = useModelsStore();
  
  // Local state for selected model
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  
  // Load models when component mounts
  useEffect(() => {
    const loadData = async () => {
      await loadModels();
      await loadActiveModel();
    };
    
    loadData();
  }, [loadModels, loadActiveModel]);
  
  // Update selected model when active model changes
  useEffect(() => {
    if (activeModelId) {
      setSelectedModelId(activeModelId);
    } else if (availableModels.length > 0) {
      setSelectedModelId(availableModels[0].id);
    }
  }, [activeModelId, availableModels]);
  
  // Handle selection change
  const handleModelSelect = (id: string) => {
    setSelectedModelId(id);
  };
  
  // Handle activation
  const handleActivate = async () => {
    if (selectedModelId) {
      await setActiveModel(selectedModelId);
    }
  };
  
  // Find the currently selected model
  const selectedModel = availableModels.find(model => model.id === selectedModelId);
  
  return (
    <div>
      
      {availableModels.length === 0 ? (
        <div className="text-gray-500">No models found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Models list */}
          <div className="md:col-span-1 border dark:border-gray-700 rounded">
            <h3 className="p-3 border-b dark:border-gray-700 font-medium">Available Models</h3>
            <div className="max-h-80 overflow-y-auto">
              {availableModels.map(model => (
                <div 
                  key={model.id} 
                  className={`p-3 border-b dark:border-gray-700 last:border-b-0 cursor-pointer ${
                    model.id === selectedModelId 
                      ? 'bg-purple-50 dark:bg-purple-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleModelSelect(model.id)}
                >
                  <div className="font-medium">{model.name || model.id.substring(0, 8)}</div>
                  {model.id === activeModelId && (
                    <div className="mt-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 py-0.5 px-2 rounded inline-block">
                      Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Model details */}
          <div className="md:col-span-2 border dark:border-gray-700 rounded">
            {selectedModel ? (
              <div>
                <h3 className="p-3 border-b dark:border-gray-700 font-medium">
                  Model Details
                </h3>
                <div className="p-4">
                  <div className="mb-4">
                    <div className="font-medium">ID</div>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedModel.id}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="font-medium">Name</div>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedModel.name || 'Unnamed'}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="font-medium">Provider</div>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedModel.provider || 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    {selectedModel.id === activeModelId ? (
                      <div className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 py-1 px-3 rounded">
                        Currently active
                      </div>
                    ) : (
                      <button
                        onClick={handleActivate}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-gray-500">
                Select a model to view details
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
