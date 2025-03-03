import { Ollama } from 'ollama';
import { BaseProvider } from '../base';
import type { Message, MessageStream, ProviderConfig } from '../types';
import { NetworkError } from '../errors';

export class OllamaProvider extends BaseProvider {
  private client: Ollama;

  constructor(config: ProviderConfig) {
    super(config);
    const host = config.baseUrl || 'http://localhost:11434';
    this.client = new Ollama({ host });
    this.logger.debug('Ollama client initialized', { host });
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream {
    this.logger.debug('Creating message with Ollama', {
      modelId: this.config.modelId,
      maxTokens: this.config.modelInfo.maxTokens,
      messagesCount: messages.length,
      systemPromptLength: systemPrompt.length
    });

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

      this.logger.debug('Stream created with Ollama');

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          this.logger.debug('Content chunk received', { 
            contentLength: chunk.message.content.length 
          });

          yield {
            type: 'text',
            text: chunk.message.content
          };
        }

        // Add usage info
        if (chunk.eval_count) {
          const usage = {
            inputTokens: chunk.prompt_eval_count || 0,
            outputTokens: chunk.eval_count
          };

          this.logger.debug('Usage info', usage);

          yield {
            type: 'usage',
            ...usage
          };
        }
      }

      this.logger.debug('Message creation completed successfully');
    } catch (error) {
      this.logger.error('Ollama API error', { 
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw new NetworkError('Ollama API error', error as Error);
    }
  }
}