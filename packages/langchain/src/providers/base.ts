import {
  BaseChatModel,
  BaseChatModelCallOptions
} from "@langchain/core/language_models/chat_models";
import { BaseMessage, AIMessageChunk } from "@langchain/core/messages";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatResult } from "@langchain/core/outputs";


export interface StreamingTurn {
  type: 'content' | 'tool_call' | 'tool_result';
  content?: string;
  toolCall?: {
    server: string;
    input: any;
  };
  toolResult?: any;
}

export interface ProviderConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
  streaming?: boolean;
}

export abstract class BaseProvider extends BaseChatModel<BaseChatModelCallOptions, AIMessageChunk> {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    super({});
    this.config = config;
  }

  /** Must be implemented by specific provider */
  abstract _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult>;


  async generateStream(
    messages: BaseMessage[],
    onTurn: (turn: StreamingTurn) => Promise<void>,
    options?: this["ParsedCallOptions"]
  ): Promise<void> {
    const result = await this._generate(
      messages,
      options ?? {},
      undefined  // CallbackManagerForLLMRun is optional
    );

    if (result.generations[0]?.message) {
      await onTurn({
        type: 'content',
        content: result.generations[0].message.content.toString()
      });
    }
  }
}