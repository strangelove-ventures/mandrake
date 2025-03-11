/**
 * Types for models configuration components
 */

export interface ModelsComponentProps {
  isWorkspace?: boolean;
  workspaceId?: string;
}

// Provider types (same as @mandrake/utils)
export type ProviderType = 'anthropic' | 'ollama' | 'xai';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
}

// Model config types (same as @mandrake/utils)
export interface ModelConfig {
  enabled: boolean;
  providerId: string;
  modelId: string;
  config: {
    temperature?: number;
    maxTokens?: number;
  };
}

// Overall config (same as @mandrake/utils)
export interface ModelsConfig {
  active: string;
  providers: Record<string, ProviderConfig>;
  models: Record<string, ModelConfig>;
}

// UI state for editing a provider
export interface ProviderEditState {
  providerId: string;
  config: ProviderConfig;
}

// UI state for editing a model
export interface ModelEditState {
  modelId: string;
  config: ModelConfig;
}

// Model info from @mandrake/utils
export interface ModelInfo {
  maxTokens: number;
  contextWindow: number;
  supportsImages?: boolean;
  supportsComputerUse?: boolean;
  inputPrice?: number;
  outputPrice?: number;
  description?: string;
}
