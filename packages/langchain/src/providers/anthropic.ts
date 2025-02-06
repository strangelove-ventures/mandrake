import {
  BaseMessage
} from "@langchain/core/messages";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatAnthropic, ChatAnthropicCallOptions } from "@langchain/anthropic";
import { ChatResult } from "@langchain/core/outputs";
import { BaseProvider, ProviderConfig } from "./base";

export class AnthropicProvider extends BaseProvider {
  private client: ChatAnthropic;
  public _llmType(): string {
    return "anthropic";
  }

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new ChatAnthropic({
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: config.streaming,
      anthropicApiKey: config.apiKey,
    });
  }

  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    return this.client._generate(messages, options as any, runManager);
  }
}