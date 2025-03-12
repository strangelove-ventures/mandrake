'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ModelsComponentProps } from './types';
import { useModelsConfig } from './hooks';
import { useModelsStore } from '@/stores/system/models';
import ProviderList from './ProviderList';
import ProviderEditor from './ProviderEditor';
import ProviderDialog from './ProviderDialog';
import ModelList from './ModelList';
import ModelEditor from './ModelEditor';
import ModelDialog from './ModelDialog';

/**
 * ModelsConfig component that can be used in both system and workspace contexts
 */
export default function ModelsConfig({ isWorkspace = false, workspaceId }: ModelsComponentProps) {
  console.log(`ModelsConfig shared component - isWorkspace: ${isWorkspace}, workspaceId: ${workspaceId || 'none'}`);
  const {
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
    
    handleEditProvider,
    handleSaveProviderEdits,
    handleToggleProviderEnabled,
    handleAddProvider,
    handleEditModel,
    handleSaveModelEdits,
    handleToggleModelEnabled,
    handleSetActiveModel,
    handleAddModel,
    loadModels,
    loadActiveModel
  } = useModelsConfig(isWorkspace ? workspaceId : undefined);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('models');
  
  // Debug: Direct access to store for logging
  const store = useModelsStore();
  
  // Debug logging
  useEffect(() => {
    console.log('Models Store State:', { 
      models: store.models,
      activeModelId: store.activeModelId,
      isLoading: store.isLoading,
      error: store.error,
      modelsData
    });
  }, [store.models, store.activeModelId, store.isLoading, store.error, modelsData]);
  
  // If loading, show a loading state
  if (isLoading) {
    return <div className="text-center p-4">Loading models configuration...</div>;
  }
  
  // If no data yet, show an error or loading state
  if (!modelsData) {
    return (
      <div className="text-center p-4">
        <h2 className="text-2xl font-bold mb-4">Models Configuration</h2>
        <div className="p-8 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No models configuration found. This could be due to:
          </p>
          <ul className="list-disc pl-5 text-gray-500 dark:text-gray-400 text-left">
            <li>API connection issue - check the backend is running on port 4000</li>
            <li>Missing configuration file - default should be created automatically</li>
            <li>Permission issues accessing configuration directory</li>
          </ul>
          <Button 
            onClick={() => { loadModels(); loadActiveModel(); }}
            className="mt-4"
          >
            Retry Loading
          </Button>
        </div>
        
        {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
        Error: {error}
        </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Models Configuration</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
        </TabsList>
        
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LLM Providers</CardTitle>
              <CardDescription>
                Configure the providers that will be used to access language models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProviderList 
                providers={modelsData.providers} 
                selectedProviderId={selectedProviderId}
                onSelectProvider={setSelectedProviderId}
                onEditProvider={handleEditProvider}
                onToggleProviderEnabled={handleToggleProviderEnabled}
                onAddProvider={() => setIsCreatingProvider(true)}
              />
              
              {providerConfigError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Error in provider configuration: {providerConfigError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Configurations</CardTitle>
              <CardDescription>
                Configure the models that will be used for AI responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelList 
                models={modelsData.models}
                providers={modelsData.providers}
                activeModelId={modelsData.active}
                selectedModelId={selectedModelId}
                onSelectModel={setSelectedModelId}
                onEditModel={handleEditModel}
                onToggleModelEnabled={handleToggleModelEnabled}
                onSetActiveModel={handleSetActiveModel}
                onAddModel={() => setIsCreatingModel(true)}
              />
              
              {modelConfigError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Error in model configuration: {modelConfigError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Provider edit dialog */}
      <ProviderEditor
        isOpen={isEditingProvider}
        onClose={() => setIsEditingProvider(false)}
        editingProvider={editingProvider}
        onSave={handleSaveProviderEdits}
      />
      
      {/* Provider create dialog */}
      <ProviderDialog
        isOpen={isCreatingProvider}
        onClose={() => setIsCreatingProvider(false)}
        providerId={newProviderId}
        providerType={newProviderType}
        onAddProvider={handleAddProvider}
        setProviderId={setNewProviderId}
        setProviderType={setNewProviderType}
      />
      
      {/* Model edit dialog */}
      <ModelEditor
        isOpen={isEditingModel}
        onClose={() => setIsEditingModel(false)}
        editingModel={editingModel}
        providers={modelsData?.providers || {}}
        onSave={handleSaveModelEdits}
      />
      
      {/* Model create dialog */}
      <ModelDialog
        isOpen={isCreatingModel}
        onClose={() => setIsCreatingModel(false)}
        modelId={newModelId}
        providerId={newModelProviderId}
        providers={modelsData?.providers || {}}
        onAddModel={handleAddModel}
        setModelId={setNewModelId}
        setProviderId={setNewModelProviderId}
      />
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
    </div>
  );
}

// Named exports for individual components
export { default as ProviderList } from './ProviderList';
export { default as ProviderEditor } from './ProviderEditor';
export { default as ProviderDialog } from './ProviderDialog';
export { default as ModelList } from './ModelList';
export { default as ModelEditor } from './ModelEditor';
export { default as ModelDialog } from './ModelDialog';
export { useModelsConfig } from './hooks';
