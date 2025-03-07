/**
 * Model-related types
 * 
 * Note: Most model types are already defined in utils/models/models.ts
 * This file re-exports those types and adds any additional model types needed
 */

import type { 
  ModelInfo,
  anthropicModels, 
  ollamaModels, 
  xaiModels 
} from '../../models/models';
import type { ProviderType } from '../../models/schemas';

export type { ModelInfo };

/**
 * Type for Anthropic model IDs
 */
export type AnthropicModelId = keyof typeof anthropicModels;

/**
 * Type for Ollama model IDs
 */
export type OllamaModelId = keyof typeof ollamaModels;

/**
 * Type for XAI model IDs
 */
export type XAIModelId = keyof typeof xaiModels;

/**
 * Model descriptor with ID and info
 */
export interface ModelDescriptor {
  id: string;
  info: ModelInfo;
}

/**
 * Get a model descriptor
 */
export type GetModelFn = () => ModelDescriptor;