import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage } from "@langchain/core/messages";
import { LLMProvider, LLMProviderConfig } from "./base";

export class AnthropicProvider implements LLMProvider {
    private llm: ChatAnthropic;

    constructor(config: LLMProviderConfig) {
        this.llm = new ChatAnthropic({
            modelName: "claude-3-5-sonnet-20241022",
            streaming: true,
            maxTokens: config.maxTokens || 4096,
            temperature: config.temperature || 0.7,
            anthropicApiKey: config.apiKey
        });
    }

    async *stream(messages: BaseMessage[]) {
        const stream = await this.llm.stream(messages);
        for await (const chunk of stream) {
            yield chunk;
        }
    }
}
