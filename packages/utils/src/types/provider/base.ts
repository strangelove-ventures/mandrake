/**
 * Base provider types for LLM providers
 */

import type { ModelInfo } from '../../models/models';
import type { Message } from '../../common-types';

/**
 * Configuration for a provider implementation
 */
export interface ProviderImplConfig {
  /** Identifier for the model to use */
  modelId: string;
  
  /** Information about the model */
  modelInfo: ModelInfo;
  
  /** API key for authentication */
  apiKey?: string;
  
  /** Base URL for the provider API */
  baseUrl?: string;
}

/**
 * A stream of message chunks from a provider
 */
export type MessageStream = AsyncGenerator<MessageStreamChunk>;

/**
 * A chunk in a message stream
 */
export type MessageStreamChunk = 
  | TextChunk
  | UsageChunk;

/**
 * A text chunk in a message stream
 */
export interface TextChunk {
  type: 'text';
  text: string;
}

/**
 * A usage information chunk in a message stream
 */
export interface UsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
}

/**
 * Interface for an LLM provider
 */
export interface IProvider {
  /**
   * Create a message stream from a system prompt and user messages
   */
  createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream;
  
  /**
   * Get information about the current model
   */
  getModel(): {
    id: string;
    info: ModelInfo;
  };
  
  /**
   * Calculate the cost of a message based on token usage
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
  ): number;
}