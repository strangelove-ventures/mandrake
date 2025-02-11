import { MCPService, Tool } from '@mandrake/types';
import { Anthropic } from '@anthropic-ai/sdk';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionUsage {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result';
  content?: string;
  tool?: string;
  input?: any;
  result?: any;
}

export interface ProviderConfig {
  provider: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens: number;
  temperature: number;
  model?: string;
}

export interface ProviderHandler {
  createMessage(
    systemPrompt: string,
    messages: Message[],
    tools?: Tool[]
  ): Promise<AsyncIterable<StreamChunk>>;

  getModel(): {
    id: string;
    contextWindow: number;
  };

  estimateTokens(text: string): number;
  calculateCost(inputTokens: number, outputTokens: number): number;
}
