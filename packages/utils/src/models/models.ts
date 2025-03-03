import { ProviderType } from './schemas';

// Model info types and data
export interface ModelInfo {
  maxTokens: number;
  contextWindow: number;
  supportsImages?: boolean;
  supportsComputerUse?: boolean;
  inputPrice?: number;
  outputPrice?: number;
  description?: string;
}

// Anthropic Models
export const anthropicModels = {
  'claude-3-7-sonnet-latest': {
    maxTokens: 128_000,
    contextWindow: 128_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 15.0,
    outputPrice: 75.0,
    description: 'Most capable model, ideal for complex tasks requiring deep analysis'
  },
  'claude-3-opus-20240229': {
    maxTokens: 4096,
    contextWindow: 200_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 15.0,
    outputPrice: 75.0,
    description: 'Most capable model, ideal for complex tasks requiring deep analysis'
  },
  'claude-3-5-sonnet-20241022': {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    description: 'Larger model for longer responses and more complex tasks'
  },
  'claude-3-haiku-20240307': {
    maxTokens: 4096,
    contextWindow: 200_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 0.25,
    outputPrice: 1.25,
    description: 'Fastest model, ideal for quick responses and simpler tasks'
  }
} as const satisfies Record<string, ModelInfo>;

export const ollamaModels = {
  "llama3.2:3b": {
    maxTokens: 8192,
    contextWindow: 128_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 0.25, // $0.25 per million input tokens
    outputPrice: 1.25, // $1.25 per million output tokens
  },
  "llama3.3:70b": {
    maxTokens: 4096,
    contextWindow: 130_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 0.25, // $0.25 per million input tokens
    outputPrice: 1.25, // $1.25 per million output tokens
  }
} as const satisfies Record<string, ModelInfo>;

// XAI Models
export const xaiModels = {
  "grok-beta": {
    maxTokens: 4096, 
    contextWindow: 128_000,
    supportsImages: false,
    supportsComputerUse: true,
    inputPrice: 2.0,  // $2 per million input tokens
    outputPrice: 10.0, // $10 per million output tokens
    description: 'xAI Grok Beta - Experimental language model with advanced reasoning capabilities'
  },
  "grok-1": {
    maxTokens: 4096,
    contextWindow: 8_000,
    supportsImages: false,
    supportsComputerUse: true,
    inputPrice: 2.0,
    outputPrice: 10.0,
    description: 'Original version of Grok - First generation xAI model'
  },
  "grok-1.5": {
    maxTokens: 4096,
    contextWindow: 128_000,
    supportsImages: false,
    supportsComputerUse: true,
    inputPrice: 2.0,
    outputPrice: 10.0,
    description: 'Improved reasoning capabilities with extended context window'
  },
  "grok-2": {
    maxTokens: 4096,
    contextWindow: 128_000,
    supportsImages: false,
    supportsComputerUse: true,
    inputPrice: 2.0,
    outputPrice: 10.0,
    description: 'Second generation xAI model with enhanced performance'
  },
  "grok-3": {
    maxTokens: 8192,
    contextWindow: 1_000_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 2.0,
    outputPrice: 10.0,
    description: 'Most capable xAI model with million-token context window'
  },
  "grok-3-mini": {
    maxTokens: 4096,
    contextWindow: 128_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 1.0,
    outputPrice: 5.0,
    description: 'Faster and more efficient version of Grok-3'
  }
} as const satisfies Record<string, ModelInfo>;

// Provider to Model mapping
export const PROVIDER_MODELS: Record<ProviderType, Record<string, ModelInfo>> = {
  'anthropic': anthropicModels,
  'ollama': ollamaModels,
  'xai': xaiModels
} as const;

// Default models for each provider
export const DEFAULT_MODELS: Record<ProviderType, string> = {
  'anthropic': 'claude-3-5-sonnet-20241022',
  'ollama': 'llama3.3:70b',
  'xai': 'grok-beta'
} as const;

// Helper functions
export function getModelInfo(provider: ProviderType, modelId: string): ModelInfo | undefined {
  return PROVIDER_MODELS[provider]?.[modelId];
}

export function getDefaultModel(provider: ProviderType): string {
  return DEFAULT_MODELS[provider];
}

export function getProviderModels(provider: ProviderType): string[] {
  return Object.keys(PROVIDER_MODELS[provider] || {});
}