/**
 * Custom hooks for tools functionality
 */
import { useState, useEffect, useCallback } from 'react';
import { useToolsStore } from '@/stores/system/tools';
import { ServerConfig, ToolConfig, ToolsConfig, ServerEditState } from './types';

/**
 * Hook for tools configuration state and operations
 */
export function useToolsConfig(workspaceId?: string) {
  // Main state from the store
  const { 
    availableTools, 
    activeToolsId, 
    loadTools, 
    loadActiveTools, 
    setActiveTools,
    updateToolConfig,
    isLoading, 
    error 
  } = useToolsStore();
  
  // Local state
  const [toolsData, setToolsData] = useState<ToolsConfig | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isEditingServer, setIsEditingServer] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerEditState | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);
  const [newConfigId, setNewConfigId] = useState('');
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [newServerId, setNewServerId] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [serverConfigJson, setServerConfigJson] = useState('');
  const [serverConfigError, setServerConfigError] = useState<string | null>(null);
  
  // Process available tools data
  useEffect(() => {
    if (availableTools.length > 0) {
      try {
        // Get the raw data from the first item
        const rawData = availableTools[0];
        
        // Log data for debugging
        console.log('Raw tools data:', rawData);
        
        if (rawData && typeof rawData.active === 'string' && rawData.configs) {
          setToolsData(rawData as unknown as ToolsConfig);
          
          // Set selected config to active one if available
          if (rawData.active && rawData.configs[rawData.active]) {
            setSelectedConfigId(rawData.active);
            
            // Set selected server to first server in active config
            const serverIds = Object.keys(rawData.configs[rawData.active]);
            if (serverIds.length > 0) {
              setSelectedServerId(serverIds[0]);
            }
          } else if (Object.keys(rawData.configs).length > 0) {
            // If active config not found, select the first available
            const firstConfig = Object.keys(rawData.configs)[0];
            setSelectedConfigId(firstConfig);
            
            const serverIds = Object.keys(rawData.configs[firstConfig]);
            if (serverIds.length > 0) {
              setSelectedServerId(serverIds[0]);
            }
          }
        } else {
          console.error('Unexpected data format for tools configuration:', rawData);
        }
      } catch (err) {
        console.error('Error processing tools data:', err);
      }
    }
  }, [availableTools]);
  
  // Set default server config JSON when opening the dialog
  useEffect(() => {
    if (isCreatingServer) {
      setServerConfigJson(JSON.stringify({
        command: "ripper-server",
        args: ["--transport=stdio", "--excludePatterns=\\.ws"]
      }, null, 2));
      setServerConfigError(null);
    }
  }, [isCreatingServer]);
  
  // Load tools when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadTools();
        await loadActiveTools();
      } catch (error) {
        console.error('Failed to load tools data:', error);
      }
    };
    
    loadData();
  }, [loadTools, loadActiveTools]);
  
  // Handle selecting a config
  const handleSelectConfig = useCallback((configId: string) => {
    setSelectedConfigId(configId);
    
    // Reset selected server
    if (toolsData && toolsData.configs[configId]) {
      const serverIds = Object.keys(toolsData.configs[configId]);
      setSelectedServerId(serverIds.length > 0 ? serverIds[0] : null);
    } else {
      setSelectedServerId(null);
    }
  }, [toolsData]);
  
  // Handle selecting a server
  const handleSelectServer = useCallback((serverId: string) => {
    setSelectedServerId(serverId);
  }, []);
  
  // Handle activating a config
  const handleActivateConfig = useCallback(async (configId: string) => {
    try {
      await setActiveTools(configId);
      // Refresh data
      await loadTools();
      await loadActiveTools();
    } catch (error) {
      console.error('Failed to activate config:', error);
    }
  }, [loadActiveTools, loadTools, setActiveTools]);
  
  // Handle editing a server
  const handleEditServer = useCallback((configId: string, serverId: string) => {
    if (toolsData && toolsData.configs[configId] && toolsData.configs[configId][serverId]) {
      setEditingServer({
        configId,
        serverId,
        config: {...toolsData.configs[configId][serverId]}
      });
      setIsEditingServer(true);
    }
  }, [toolsData]);
  
  // Handle saving server edits
  const handleSaveServerEdits = useCallback(async (serverEdit: ServerEditState) => {
    if (!serverEdit || !toolsData) return;
    
    try {
      const { configId, serverId, config } = serverEdit;
      
      // Create updated config
      const updatedConfig = { 
        ...toolsData.configs[configId],
        [serverId]: config
      };
      
      // Call API to update server config
      await updateToolConfig(configId, updatedConfig);
      
      // Refresh data
      await loadTools();
      
      // Update local state
      if (toolsData) {
        const newToolsData = {...toolsData};
        newToolsData.configs[configId][serverId] = config;
        setToolsData(newToolsData);
      }
      
      setIsEditingServer(false);
      setEditingServer(null);
    } catch (err) {
      console.error('Error saving server config:', err);
    }
  }, [loadTools, toolsData, updateToolConfig]);
  
  // Handle adding a new config
  const handleAddConfig = useCallback(async () => {
    if (!newConfigId.trim() || !toolsData) return;
    
    try {
      // Create a new empty config with default ripper server
      const newConfig: ToolConfig = {
        ripper: {
          command: 'ripper-server',
          args: ['--transport=stdio', '--excludePatterns=\\.ws']
        }
      };
      
      // Update local state first for immediate feedback
      const newToolsData = {...toolsData};
      newToolsData.configs[newConfigId] = newConfig;
      setToolsData(newToolsData);
      
      // TODO: Call API to add config when implemented
      // await api.tools.create(newConfigId, newConfig);
      console.log('Creating new config:', newConfigId);
      
      // Select the new config
      setSelectedConfigId(newConfigId);
      setSelectedServerId('ripper');
      
      // Close dialog and reset form
      setIsCreatingConfig(false);
      setNewConfigId('');
      
      // Refresh data
      await loadTools();
    } catch (err) {
      console.error('Error adding config:', err);
    }
  }, [loadTools, newConfigId, toolsData]);
  
  // Handle adding a new server
  const handleAddServer = useCallback(async () => {
    if (!selectedConfigId || !newServerId.trim() || !toolsData) return;
    
    try {
      // Parse the server config JSON
      let serverConfig: ServerConfig;
      try {
        serverConfig = JSON.parse(serverConfigJson);
        
        // Validate the parsed config
        if (!serverConfig.command) {
          throw new Error('Server config must have a "command" property');
        }
        
        // Ensure args is an array if provided
        if (serverConfig.args && !Array.isArray(serverConfig.args)) {
          throw new Error('"args" must be an array of strings');
        }
        
        // Ensure env is an object if provided
        if (serverConfig.env && typeof serverConfig.env !== 'object') {
          throw new Error('"env" must be an object');
        }
        
        // Ensure autoApprove is an array if provided
        if (serverConfig.autoApprove && !Array.isArray(serverConfig.autoApprove)) {
          throw new Error('"autoApprove" must be an array of strings');
        }
        
      } catch (err) {
        console.error('Invalid server config JSON:', err);
        setServerConfigError(err instanceof Error ? err.message : 'Invalid JSON');
        return;
      }
      
      // Update local state first for immediate feedback
      const newToolsData = {...toolsData};
      newToolsData.configs[selectedConfigId][newServerId] = serverConfig;
      setToolsData(newToolsData);
      
      // Create updated config for the API
      const updatedConfig = {
        ...toolsData.configs[selectedConfigId],
        [newServerId]: serverConfig
      };
      
      // Call API to update config
      await updateToolConfig(selectedConfigId, updatedConfig);
      
      // Select the new server
      setSelectedServerId(newServerId);
      
      // Close dialog and reset form
      setIsCreatingServer(false);
      setNewServerId('');
      setNewServerCommand('');
      setServerConfigJson('');
      setServerConfigError(null);
      
      // Refresh data
      await loadTools();
    } catch (err) {
      console.error('Error adding server:', err);
    }
  }, [loadTools, newServerId, selectedConfigId, serverConfigJson, toolsData, updateToolConfig]);
  
  return {
    // State
    toolsData,
    selectedConfigId,
    selectedServerId,
    isEditingServer,
    editingServer,
    isCreatingConfig,
    newConfigId,
    isCreatingServer,
    newServerId,
    newServerCommand,
    serverConfigJson,
    serverConfigError,
    isLoading,
    error,
    
    // Actions
    setSelectedConfigId,
    setSelectedServerId,
    setIsEditingServer,
    setEditingServer,
    setIsCreatingConfig,
    setNewConfigId,
    setIsCreatingServer,
    setNewServerId,
    setNewServerCommand,
    setServerConfigJson,
    
    // Handlers
    handleSelectConfig,
    handleSelectServer,
    handleActivateConfig,
    handleEditServer,
    handleSaveServerEdits,
    handleAddConfig,
    handleAddServer,
    
    // Reload functions
    loadTools,
    loadActiveTools
  };
}
