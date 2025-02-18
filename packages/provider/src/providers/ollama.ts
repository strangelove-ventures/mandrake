import ollama from 'ollama';
import { BaseProvider } from '../base';
import type { Message, MessageStream, ProviderConfig } from '../types';
import { NetworkError } from '../errors';

export class OllamaProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    // ollama.config({ host: this.baseUrl });
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream {
    try {
      const stream = await ollama.chat({
        model: this.config.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        stream: true,
        options: {
          num_predict: this.config.modelInfo.maxTokens
        }
      });

      for await (const part of stream) {
        // Each part has eval_count (input) and eval_duration
        if (part.eval_count && part.eval_duration) {
          yield {
            type: 'usage',
            inputTokens: part.eval_count,
            outputTokens: 0  // We'll update this as we get content
          };
        }

        if (part.message?.content) {
          yield {
            type: 'text',
            text: part.message.content
          };
        }

        // If this is final message, update token counts
        if (part.done && part.eval_count) {
          yield {
            type: 'usage',
            inputTokens: part.eval_count,
            outputTokens: part.eval_count  // This is approximate
          };
        }
      }
    } catch (error: any) {
      throw new NetworkError('Ollama API error', error);
    }
  }
}