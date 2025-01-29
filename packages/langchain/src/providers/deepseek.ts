import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { LLMProvider, LLMProviderConfig } from "./base";

export class DeepseekProvider implements LLMProvider {
    private llm: ChatOpenAI;

    constructor(config: LLMProviderConfig) {
        this.llm = new ChatOpenAI({
            streaming: true,
            modelName: "deepseek-chat",
            maxTokens: config.maxTokens || 4096,
            temperature: config.temperature || 0.7,
            configuration: {
                baseURL: config.baseURL || "https://api.deepseek.com/v1",
                apiKey: config.apiKey,
            }
        });
    }

    async *stream(messages: BaseMessage[]) {
        const stream = await this.llm.stream(messages);
        for await (const chunk of stream) {
            yield chunk;
        }
    }
}
