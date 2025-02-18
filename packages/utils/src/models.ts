export interface ModelInfo {
  maxTokens: number;
  contextWindow: number;
  supportsImages?: boolean;
  supportsComputerUse?: boolean;
  inputPrice?: number;
  outputPrice?: number;
  description?: string;
}

export type ProviderType = 
  | 'anthropic'
  | 'ollama'
  | 'openai'
  | 'openrouter'
  | 'mistral';

// Anthropic Models
export const anthropicModels = {
  'claude-3-opus-20240229': {
    maxTokens: 4096,
    contextWindow: 200_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 15.0, // $15 per million input tokens
    outputPrice: 75.0, // $75 per million output tokens
    description: 'Most capable model, ideal for complex tasks requiring deep analysis'
  },
  'claude-3-sonnet-20240229': {
    maxTokens: 4096,
    contextWindow: 200_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 3.0, // $3 per million input tokens
    outputPrice: 15.0, // $15 per million output tokens
    description: 'Balanced performance and cost, suitable for most use cases'
  },
  "claude-3-5-sonnet-20241022": {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 3.0, // $3 per million input tokens
    outputPrice: 15.0, // $15 per million output tokens
  },
  'claude-3-haiku-20240307': {
    maxTokens: 4096,
    contextWindow: 200_000,
    supportsImages: true,
    supportsComputerUse: true,
    inputPrice: 0.25, // $0.25 per million input tokens
    outputPrice: 1.25, // $1.25 per million output tokens
    description: 'Fastest model, ideal for quick responses and simpler tasks'
  }
} as const satisfies Record<string, ModelInfo>;

// Mistral Models
export const mistralModels = {
  'mistral-large-2411': {
    maxTokens: 131_000,
    contextWindow: 131_000,
    supportsImages: false,
    inputPrice: 2.0,
    outputPrice: 6.0,
    description: 'Flagship model with strong performance across tasks'
  },
  'mistral-small-2501': {
    maxTokens: 32_000,
    contextWindow: 32_000,
    supportsImages: false,
    inputPrice: 0.1,
    outputPrice: 0.3,
    description: 'Efficient model balancing performance and cost'
  },
  'codestral-2501': {
    maxTokens: 256_000,
    contextWindow: 256_000,
    supportsImages: false,
    inputPrice: 0.3,
    outputPrice: 0.9,
    description: 'Specialized for code-related tasks'
  }
} as const satisfies Record<string, ModelInfo>;

// Ollama Models
// Note: Local models, so no pricing
export const ollamaModels = {
  'llama2': {
    maxTokens: 4096,
    contextWindow: 4096,
    supportsImages: false,
    description: 'Open source base model'
  },
  'mistral': {
    maxTokens: 8192,
    contextWindow: 8192,
    supportsImages: false,
    description: 'Open source Mistral model'
  },
  'codellama': {
    maxTokens: 16384,
    contextWindow: 16384,
    supportsImages: false,
    description: 'Specialized for code generation and analysis'
  }
} as const satisfies Record<string, ModelInfo>;

// Provider to Model mapping
export const PROVIDER_MODELS: Record<ProviderType, Record<string, ModelInfo>> = {
  'anthropic': anthropicModels,
  'mistral': mistralModels,
  'ollama': ollamaModels,
  'openai': {}, // TODO: Add OpenAI models
  'openrouter': {} // TODO: Add OpenRouter models
} as const;

// Default models for each provider
export const DEFAULT_MODELS: Record<ProviderType, string> = {
  'anthropic': 'claude-3-sonnet-20240229',
  'mistral': 'mistral-small-2501',
  'ollama': 'llama2',
  'openai': 'gpt-4-turbo-preview',
  'openrouter': 'anthropic/claude-3-sonnet'
} as const;

// Helper to get model info
export function getModelInfo(provider: ProviderType, modelId: string): ModelInfo | undefined {
  return PROVIDER_MODELS[provider]?.[modelId];
}

// Helper to get default model for provider
export function getDefaultModel(provider: ProviderType): string {
  return DEFAULT_MODELS[provider];
}

// Helper to get available models for provider
export function getProviderModels(provider: ProviderType): string[] {
  return Object.keys(PROVIDER_MODELS[provider] || {});
}

// Helper to calculate token cost
export function calculateTokenCost(
  modelInfo: ModelInfo,
  inputTokens: number,
  outputTokens: number
): number {
  const input = (modelInfo.inputPrice || 0) / 1_000_000 * inputTokens;
  const output = (modelInfo.outputPrice || 0) / 1_000_000 * outputTokens;
  return Number((input + output).toFixed(6));
}