/**
 * Anthropic provider-specific types
 */

import type { Message } from '../../common-types';

/**
 * Message format for Anthropic API
 */
export interface AnthropicMessage {
  role: string;
  content: string;
}

/**
 * API request parameters for Anthropic
 */
export interface AnthropicRequestParams {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
  stream: boolean;
}

/**
 * Convert standard messages to Anthropic format
 */
export type ConvertMessagesForAnthropic = (messages: Message[]) => AnthropicMessage[];