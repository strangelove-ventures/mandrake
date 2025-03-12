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
        
        if (rawData && typeof rawData.active === 'string') {
          // Ensure providers is an object
          const providers = rawData.providers || {};
          // Ensure models is an object
          const models = rawData.models || {};
          
          console.log('Setting models data', {
            active: rawData.active,
            providers,
            models
          });
          
          setModelsData({
            active: rawData.active,
            providers,
            models
          } as ModelsConfig);
          
          // Set selected provider to first provider if not already set
          const providerKeys = Object.keys(providers);
          if (!selectedProviderId && providerKeys.length > 0) {
            setSelectedProviderId(providerKeys[0]);
            console.log('Setting selected provider to:', providerKeys[0]);
          }
          
          // Set selected model to active model if available
          const modelKeys = Object.keys(models);
          if (rawData.active && models[rawData.active]) {
            setSelectedModelId(rawData.active);
            console.log('Setting selected model to active:', rawData.active);
          } else if (modelKeys.length > 0) {
            setSelectedModelId(modelKeys[0]);
            console.log('Setting selected model to first available:', modelKeys[0]);
          }
        } else {
          console.error('Unexpected data format for models configuration:', rawData);
          // Create empty config as fallback
          setModelsData({
            active: '',
            providers: {},
            models: {}
          });
        }
      } catch (err) {
        console.error('Error processing models data:', err);
        // Create empty config as fallback
        setModelsData({
          active: '',
          providers: {},
          models: {}
        });
      }
    }
  }, [models, selectedProviderId]);
  
  // Load models when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log(`Loading models with workspaceId: ${workspaceId || 'system'}`); 
        await loadModels(workspaceId);
        await loadActiveModel(workspaceId);
      } catch (error) {
        console.error('Failed to load models data:', error);
      }
    };
    
    loadData();
  }, [loadModels, loadActiveModel, workspaceId]);
  
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
      await updateProvider(providerId, config, workspaceId);
      
      // Update local state
      if (modelsData) {
        const newModelsData = {...modelsData};
        newModelsData.providers[providerId] = config;
        setModelsData(newModelsData);
      }
      
      setIsEditingProvider(false);
      setEditingProvider(null);
      
      // Refresh data
      await loadModels(workspaceId);
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
      await loadModels(workspaceId);
    } catch (err) {
      console.error('Error toggling provider enabled state:', err);
    }
  }, [loadModels, modelsData, updateProvider]);

  /**
   * Handle adding a new provider
   */
  const handleAddProvider = useCallback(async () => {
    if (!newProviderId || !newProviderType || !modelsData) {
      console.error('Missing required fields for new provider');
      return;
    }

    try {
      // Create a default provider configuration
      const providerConfig: ProviderConfig = {
        type: newProviderType as ProviderType,
        apiKey: '',
        baseUrl: newProviderType === 'ollama' ? 'http://localhost:11434' : undefined
      };

      // Call API to add the provider
      try {
        await api.models.createProvider(newProviderId, providerConfig, workspaceId);
      } catch (error) {
        console.error('API call failed, but continuing with local state update', error);
      }
      
      // Update local state immediately for better UX
      const newModelsData = {...modelsData};
      newModelsData.providers[newProviderId] = providerConfig;
      setModelsData(newModelsData);
      
      // Select the new provider
      setSelectedProviderId(newProviderId);
      
      // Close dialog and reset form
      setIsCreatingProvider(false);
      setNewProviderId('');
      setNewProviderType('anthropic');
      
      // Refresh data
      await loadModels(workspaceId);
    } catch (err) {
      console.error('Error adding provider:', err);
      setProviderConfigError(err instanceof Error ? err.message : 'Failed to add provider');
    }
  }, [loadModels, modelsData, newProviderId, newProviderType, workspaceId, setSelectedProviderId, setIsCreatingProvider, setNewProviderId, setNewProviderType]);
  
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
      await updateModel(modelId, config, workspaceId);
      
      // Update local state
      if (modelsData) {
        const newModelsData = {...modelsData};
        newModelsData.models[modelId] = config;
        setModelsData(newModelsData);
      }
      
      setIsEditingModel(false);
      setEditingModel(null);
      
      // Refresh data
      await loadModels(workspaceId);
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
      await loadModels(workspaceId);
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
      console.log(`Setting active model to: ${modelId}`);
      
      // Update local state immediately for better UX
      const newModelsData = {...modelsData};
      newModelsData.active = modelId;
      setModelsData(newModelsData);
      
      // Call API to set active model
      await setActiveModel(modelId, workspaceId);
      
      // Select the newly activated model
      setSelectedModelId(modelId);
      
      // Refresh data to confirm changes
      await loadModels(workspaceId);
      await loadActiveModel(workspaceId);
    } catch (err) {
      console.error('Error setting active model:', err);
      // Revert local state on error
      if (modelsData) {
        setModelsData({...modelsData});
      }
    }
  }, [loadActiveModel, loadModels, modelsData, setActiveModel, setSelectedModelId]);

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
      await loadModels(workspaceId);
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
    handleAddProvider,
    
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
