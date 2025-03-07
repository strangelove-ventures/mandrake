/**
 * XAI provider-specific types
 */

/**
 * Message format for XAI API
 */
export interface XAIMessage {
  role: string;
  content: string;
}

/**
 * Stream chunk format from XAI API
 */
export interface XAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * API request parameters for XAI
 */
export interface XAIRequestParams {
  model: string;
  messages: XAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}