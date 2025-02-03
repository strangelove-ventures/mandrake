import { BaseMessage } from "@langchain/core/messages";

export interface LLMProviderConfig {
  apiKey: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  stream(messages: BaseMessage[]): AsyncGenerator<any, void, unknown>;
}