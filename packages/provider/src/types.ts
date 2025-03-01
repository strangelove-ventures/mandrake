import type { ModelInfo, Message } from '@mandrake/utils';

export type { Message };

export type MessageStream = AsyncGenerator<MessageStreamChunk>;

export type MessageStreamChunk = 
  | TextChunk
  | UsageChunk;

export interface TextChunk {
  type: 'text';
  text: string;
}

export interface UsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderConfig {
  modelId: string;
  modelInfo: ModelInfo;
  apiKey?: string;
  baseUrl?: string;
}