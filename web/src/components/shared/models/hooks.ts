/**
 * Custom hooks for models functionality
 */
import { useState, useEffect, useCallback } from 'react';
import { useModelsStore } from '@/stores/system/models';
import { api } from '@/lib/api';
import { 
  ModelsConfig, 
  ProviderConfig, 
  ModelConfig, 
  ProviderEditState, 
  ModelEditState 
} from './types';

/**
 * Hook for models configuration state and operations
 */
export function useModelsConfig(workspaceId?: string) {
  // Main state from the store
  const { 
    models, 
    activeModelId, 
    loadModels, 
    loadActiveModel, 
    setActiveModel,
    updateProvider,
    updateModel,
    isLoading, 
    error 
  } = useModelsStore();
  
  // Local state
  const [modelsData, setModelsData] = useState<ModelsConfig | null>(null);
  
  // Providers state
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isEditingProvider, setIsEditingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderEditState | null>(null);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [newProviderId, setNewProviderId] = useState('');
  const [newProviderType, setNewProviderType] = useState<string>('anthropic');
  
  // Models state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelEditState | null>(null);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelProviderId, setNewModelProviderId] = useState('');
  
  // Error states
  const [providerConfigError, setProviderConfigError] = useState<string | null>(null);
  const [modelConfigError, setModelConfigError] = useState<string | null>(null);
  
  // Process models data
  useEffect(() => {
    if (models.length > 0) {
      try {
        // Get the raw data from the first item
        const rawData = models[0];
        
        console.log('Raw models data:', rawData); // Debug log
        
        if (rawData && typeof rawData.active === 'string' && rawData.providers && rawData.models) {
          console.log('Setting models data', rawData);
          setModelsData(rawData as ModelsConfig);
          
          // Set selected provider to first provider if not already set
          if (!selectedProviderId && Object.keys(rawData.providers).length > 0) {
            setSelectedProviderId(Object.keys(rawData.providers)[0]);
          }
          
          // Set selected model to active model if available
          if (rawData.active && rawData.models[rawData.active]) {
            setSelectedModelId(rawData.active);
          } else if (Object.keys(rawData.models).length > 0) {
            setSelectedModelId(Object.keys(rawData.models)[0]);
          }
        } else if (Array.isArray(rawData)) {
          // If rawData is an array, we need to convert it
          console.log('Converting array data to expected format');
          
          // Try to handle different possible array formats
          const providers = {};
          const models = {};
          let active = '';
          
          // Process items in the array
          rawData.forEach(item => {
            if (item.type === 'provider') {
              providers[item.id] = {
                type: item.name,
                apiKey: item.apiKey,
                baseUrl: item.baseUrl,
              };
            } else if (item.providerId) {
              // This looks like a model
              models[item.id] = {
                enabled: item.enabled !== false,
                providerId: item.providerId,
                modelId: item.name || item.id,
                config: item.config || {}
              };
              
              // If this is marked as active, note it
              if (item.active) {
                active = item.id;
              }
            }
          });
          
          // Create a properly formatted config object
          const formattedData = {
            active,
            providers,
            models
          };
          
          console.log('Formatted data:', formattedData);
          setModelsData(formattedData as ModelsConfig);
          
          if (Object.keys(providers).length > 0) {
            setSelectedProviderId(Object.keys(providers)[0]);
          }
          
          if (active && models[active]) {
            setSelectedModelId(active);
          } else if (Object.keys(models).length > 0) {
            setSelectedModelId(Object.keys(models)[0]);
          }
        } else {
          console.error('Unexpected data format for models configuration:', rawData);
        }
      } catch (err) {
        console.error('Error processing models data:', err);
      }
    }
  }, [models, selectedProviderId]);
  
  // Load models when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadModels();
        await loadActiveModel();
      } catch (error) {
        console.error('Failed to load models data:', error);
      }
    };
    
    loadData();
  }, [loadModels, loadActiveModel]);
  
  // Provider operations
  
  /**
   * Handle editing a provider
   */
  const handleEditProvider = useCallback((providerId: string) => {
    if (modelsData && modelsData.providers[providerId]) {
      setEditingProvider({
        providerId,
        config: {...modelsData.providers[providerId]}
      });
      setIsEditingProvider(true);
    }
  }, [modelsData]);
  
  /**
   * Handle saving provider edits
   */
  const handleSaveProviderEdits = useCallback(async (providerEdit: ProviderEditState) => {
    if (!providerEdit || !modelsData) return;
    
    try {
      const { providerId, config } = providerEdit;
      
      // Call API to update provider config
      await updateProvider(providerId, config);
      
      // Update local state
      if (modelsData) {
        const newModelsData = {...modelsData};
        newModelsData.providers[providerId] = config;
        setModelsData(newModelsData);
      }
      
      setIsEditingProvider(false);
      setEditingProvider(null);
      
      // Refresh data
      await loadModels();
    } catch (err) {
      console.error('Error saving provider config:', err);
      setProviderConfigError(err instanceof Error ? err.message : 'Failed to update provider');
    }
  }, [loadModels, modelsData, updateProvider]);
  
  /**
   * Handle toggling provider enabled/disabled state
   */
  const handleToggleProviderEnabled = useCallback(async (providerId: string) => {
    if (!modelsData || !modelsData.providers[providerId]) {
      console.error('Provider not found:', providerId);
      return;
    }

    try {
      // Get current provider config
      const providerConfig = modelsData.providers[providerId];
      
      // Create updated config with toggled disabled state
      const updatedProviderConfig = {
        ...providerConfig,
        disabled: !providerConfig.disabled
      };
      
      // Call API to update provider
      await updateProvider(providerId, updatedProviderConfig);
      
      // Update local state immediately for better UX
      const newModelsData = {...modelsData};
      newModelsData.providers[providerId].disabled = !providerConfig.disabled;
      setModelsData(newModelsData);
      
      // Refresh data
      await loadModels();
    } catch (err) {
      console.error('Error toggling provider enabled state:', err);
    }
  }, [loadModels, modelsData, updateProvider]);
  
  // Model operations
  
  /**
   * Handle editing a model
   */
  const handleEditModel = useCallback((modelId: string) => {
    if (modelsData && modelsData.models[modelId]) {
      setEditingModel({
        modelId,
        config: {...modelsData.models[modelId]}
      });
      setIsEditingModel(true);
    }
  }, [modelsData]);
  
  /**
   * Handle saving model edits
   */
  const handleSaveModelEdits = useCallback(async (modelEdit: ModelEditState) => {
    if (!modelEdit || !modelsData) return;
    
    try {
      const { modelId, config } = modelEdit;
      
      // Call API to update model config
      await updateModel(modelId, config);
      
      // Update local state
      if (modelsData) {
        const newModelsData = {...modelsData};
        newModelsData.models[modelId] = config;
        setModelsData(newModelsData);
      }
      
      setIsEditingModel(false);
      setEditingModel(null);
      
      // Refresh data
      await loadModels();
    } catch (err) {
      console.error('Error saving model config:', err);
      setModelConfigError(err instanceof Error ? err.message : 'Failed to update model');
    }
  }, [loadModels, modelsData, updateModel]);
  
  /**
   * Handle toggling model enabled/disabled state
   */
  const handleToggleModelEnabled = useCallback(async (modelId: string) => {
    if (!modelsData || !modelsData.models[modelId]) {
      console.error('Model not found:', modelId);
      return;
    }

    try {
      // Get current model config
      const modelConfig = modelsData.models[modelId];
      
      // Create updated config with toggled enabled state
      const updatedModelConfig = {
        ...modelConfig,
        enabled: !modelConfig.enabled
      };
      
      // Call API to update model
      await updateModel(modelId, updatedModelConfig);
      
      // Update local state immediately for better UX
      const newModelsData = {...modelsData};
      newModelsData.models[modelId].enabled = !modelConfig.enabled;
      setModelsData(newModelsData);
      
      // Refresh data
      await loadModels();
    } catch (err) {
      console.error('Error toggling model enabled state:', err);
    }
  }, [loadModels, modelsData, updateModel]);
  
  /**
   * Handle setting active model
   */
  const handleSetActiveModel = useCallback(async (modelId: string) => {
    if (!modelsData || !modelsData.models[modelId]) {
      console.error('Model not found:', modelId);
      return;
    }

    try {
      // Call API to set active model
      await setActiveModel(modelId);
      
      // Update local state immediately for better UX
      const newModelsData = {...modelsData};
      newModelsData.active = modelId;
      setModelsData(newModelsData);
      
      // Refresh data
      await loadModels();
      await loadActiveModel();
    } catch (err) {
      console.error('Error setting active model:', err);
    }
  }, [loadActiveModel, loadModels, modelsData, setActiveModel]);

  /**
   * Handle adding a new model
   */
  const handleAddModel = useCallback(async () => {
    if (!newModelId || !newModelProviderId || !modelsData) {
      console.error('Missing required fields for new model');
      return;
    }

    try {
      // Create a default model configuration
      const modelConfig: ModelConfig = {
        enabled: true,
        providerId: newModelProviderId,
        modelId: newModelId,
        config: {
          temperature: 0.7,
          maxTokens: 4096
        }
      };

      // Update local state first for immediate feedback
      const newModelsData = {...modelsData};
      newModelsData.models[newModelId] = modelConfig;
      setModelsData(newModelsData);
      
      // Call API to add the model
      try {
        await api.models.create(newModelId, modelConfig, workspaceId);
      } catch (error) {
        console.error('API call failed, but continuing with local state update', error);
      }
      
      // Select the new model
      setSelectedModelId(newModelId);
      
      // Close dialog and reset form
      setIsCreatingModel(false);
      setNewModelId('');
      setNewModelProviderId('');
      
      // Refresh data
      await loadModels();
    } catch (err) {
      console.error('Error adding model:', err);
      setModelConfigError(err instanceof Error ? err.message : 'Failed to add model');
    }
  }, [loadModels, modelsData, newModelId, newModelProviderId, workspaceId]);
  
  return {
    // State
    modelsData,
    selectedProviderId,
    selectedModelId,
    isEditingProvider,
    editingProvider,
    isCreatingProvider,
    newProviderId,
    newProviderType,
    isEditingModel,
    editingModel,
    isCreatingModel,
    newModelId,
    newModelProviderId,
    providerConfigError,
    modelConfigError,
    isLoading,
    error,
    
    // Setters
    setSelectedProviderId,
    setSelectedModelId,
    setIsEditingProvider,
    setEditingProvider,
    setIsCreatingProvider,
    setNewProviderId,
    setNewProviderType,
    setIsEditingModel,
    setEditingModel,
    setIsCreatingModel,
    setNewModelId,
    setNewModelProviderId,
    
    // Provider handlers
    handleEditProvider,
    handleSaveProviderEdits,
    handleToggleProviderEnabled,
    
    // Model handlers
    handleEditModel,
    handleSaveModelEdits,
    handleToggleModelEnabled,
    handleSetActiveModel,
    handleAddModel,
    
    // Reload functions
    loadModels,
    loadActiveModel
  };
}
