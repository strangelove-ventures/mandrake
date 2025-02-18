import { Ollama } from 'ollama';
import { BaseProvider } from '../base';
import type { Message, MessageStream, ProviderConfig } from '../types';
import { NetworkError } from '../errors';

export class OllamaProvider extends BaseProvider {
  private client: Ollama;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Ollama({
      host: config.baseUrl || 'http://localhost:11434'
    });
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream {
    try {
      const stream = await this.client.chat({
        model: this.config.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
        options: {
          num_predict: this.config.modelInfo.maxTokens
        }
      });

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          yield {
            type: 'text',
            text: chunk.message.content
          };
        }

        // Add usage info
        if (chunk.eval_count) {
          yield {
            type: 'usage',
            inputTokens: chunk.prompt_eval_count || 0,
            outputTokens: chunk.eval_count
          };
        }
      }
    } catch (error) {
      throw new NetworkError('Ollama API error', error as Error);
    }
  }
}