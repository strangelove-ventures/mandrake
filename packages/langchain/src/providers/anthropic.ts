import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { LLMProvider, LLMProviderConfig } from "../types";

export class AnthropicProvider implements LLMProvider {
    private llm: ChatAnthropic;

    constructor(config: LLMProviderConfig) {
        this.llm = new ChatAnthropic({
            modelName: "claude-3-sonic-20240229",
            streaming: true,
            maxTokens: config.maxTokens || 4096,
            temperature: config.temperature || 0.7,
            anthropicApiKey: config.apiKey
        });
    }

    async *stream(messages: BaseMessage[]): AsyncGenerator<any, void, unknown> {
        const formattedMessages = messages.map(msg => {
            if (msg instanceof HumanMessage) {
                return { role: 'user', content: msg.content };
            } else if (msg instanceof AIMessage) {
                return { role: 'assistant', content: msg.content };
            }
            throw new Error(`Unsupported message type: ${msg.constructor.name}`);
        });
        
        const stream = await this.llm.stream(formattedMessages);
        for await (const chunk of stream) {
            yield chunk;
        }
    }
}