/**
 * Custom hooks for prompt configuration
 */
import { useState, useEffect, useCallback } from 'react';
import { usePromptStore } from '@/stores/system/prompt';
import { PromptConfig, PromptEditState } from './types';

/**
 * Hook for prompt configuration state and operations
 */
export function usePromptConfig(workspaceId?: string) {
  // Main state from the store
  const { 
    config, 
    loadConfig, 
    updateConfig,
    isLoading, 
    error 
  } = usePromptStore();
  
  // Local state
  const [promptData, setPromptData] = useState<PromptConfig | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptEditState | null>(null);
  const [promptConfigError, setPromptConfigError] = useState<string | null>(null);
  
  // Load prompt data from store when available
  useEffect(() => {
    if (config) {
      setPromptData(config);
    }
  }, [config]);
  
  // Load prompt config when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log(`Loading prompt config for ${workspaceId ? `workspace ${workspaceId}` : 'system'}`);
        await loadConfig(workspaceId);
      } catch (error) {
        console.error('Failed to load prompt data:', error);
        setPromptConfigError(
          error instanceof Error ? error.message : 'Failed to load prompt configuration'
        );
      }
    };
    
    loadData();
  }, [loadConfig, workspaceId]);
  
  /**
   * Handle editing the prompt
   */
  const handleEditPrompt = useCallback(() => {
    if (promptData) {
      setEditingPrompt({
        ...promptData
      });
      setIsEditingPrompt(true);
    }
  }, [promptData]);
  
  /**
   * Handle saving prompt edits
   */
  const handleSavePromptEdits = useCallback(async (editState: PromptEditState) => {
    if (!editState) return;
    
    try {
      // Call API to update prompt config
      await updateConfig(editState, workspaceId);
      
      // Update local state
      setPromptData(editState);
      
      setIsEditingPrompt(false);
      setEditingPrompt(null);
      setPromptConfigError(null);
      
    } catch (err) {
      console.error('Error saving prompt config:', err);
      setPromptConfigError(err instanceof Error ? err.message : 'Failed to update prompt');
    }
  }, [updateConfig, workspaceId]);
  
  /**
   * Handle toggling a boolean option
   */
  const handleToggleOption = useCallback(async (option: keyof PromptConfig) => {
    if (!promptData) return;
    
    try {
      const newValue = !promptData[option];
      
      // Update local state immediately for responsive UI
      setPromptData({
        ...promptData,
        [option]: newValue
      });
      
      // Call API to update the prompt config
      await updateConfig({ [option]: newValue }, workspaceId);
      
    } catch (err) {
      console.error(`Error toggling option ${option}:`, err);
      setPromptConfigError(err instanceof Error ? err.message : `Failed to update ${option}`);
      
      // Revert local state on error
      if (promptData) {
        setPromptData({...promptData});
      }
    }
  }, [promptData, updateConfig, workspaceId]);
  
  return {
    // State
    promptData,
    isEditingPrompt,
    editingPrompt,
    promptConfigError,
    isLoading,
    error,
    
    // Setters
    setIsEditingPrompt,
    setEditingPrompt,
    
    // Handlers
    handleEditPrompt,
    handleSavePromptEdits,
    handleToggleOption,
    
    // Reload function
    reloadConfig: () => loadConfig(workspaceId)
  };
}
