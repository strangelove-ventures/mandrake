export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export type MessageStream = AsyncGenerator<MessageStreamChunk>;

export type MessageStreamChunk = TextChunk | UsageChunk;

export interface TextChunk {
  type: 'text';
  text: string;
}

export interface UsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

export interface ModelInfo {
  maxTokens: number;
  contextWindow?: number;
  supportsImages?: boolean;
  inputPrice?: number;
  outputPrice?: number;
  cacheWritesPrice?: number;
  cacheReadsPrice?: number;
}

export interface ProviderConfig {
  modelId: string;
  modelInfo: ModelInfo;
  apiKey?: string;
  baseUrl?: string;
}

export interface ModelsConfig {
  active: string;
  models: Record<string, {
    enabled: boolean;
    provider: string;
    providerConfig: ProviderConfig;
  }>;
}