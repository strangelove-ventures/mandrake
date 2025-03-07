/**
 * Ollama provider-specific types
 */

import type { Message } from '../../common-types';

/**
 * API request parameters for Ollama
 */
export interface OllamaRequestParams {
  model: string;
  messages: Message[];
  stream: boolean;
  options?: {
    num_predict?: number;
    temperature?: number;
  };
}

/**
 * Chunk format from Ollama API
 */
export interface OllamaResponseChunk {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}