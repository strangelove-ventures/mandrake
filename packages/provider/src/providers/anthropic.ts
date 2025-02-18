import { Anthropic } from '@anthropic-ai/sdk';
import { BaseProvider } from '../base';
import type { Message, MessageStream, ProviderConfig } from '../types';
import { NetworkError, RateLimitError, TokenLimitError } from '../errors';

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
  }

  async *createMessage(
    systemPrompt: string, 
    messages: Message[]
  ): MessageStream {
    try {
      const stream = await this.client.messages.create({
        model: this.config.modelId,
        max_tokens: this.config.modelInfo.maxTokens ?? 0,
        system: systemPrompt,
        messages: this.convertMessages(messages),
        stream: true
      });

      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'message_start': {
            if (chunk.message.usage) {
              yield {
                type: 'usage',
                inputTokens: chunk.message.usage.input_tokens || 0,
                outputTokens: chunk.message.usage.output_tokens || 0,
                // cacheWriteTokens: chunk.message.usage.cache_creation_input_tokens,
                // cacheReadTokens: chunk.message.usage.cache_read_input_tokens
              };
            }
            break;
          }

          case 'content_block_start':
          case 'content_block_delta': {
            const text = this.extractText(chunk);
            if (text) {
              yield {
                type: 'text',
                text
              };
            }
            break;
          }

          case 'message_delta': {
            if (chunk.usage) {
              yield {
                type: 'usage',
                inputTokens: 0,
                outputTokens: chunk.usage.output_tokens || 0
              };
            }
            break;
          }
        }
      }
    } catch (error: any) {
      if (error.status === 429) {
        throw new RateLimitError(error.message);
      }
      if (error.status === 413) {
        throw new TokenLimitError(error.message);
      }
      throw new NetworkError('Anthropic API error', error);
    }
  }

  private convertMessages(messages: Message[]): Anthropic.Messages.MessageParam[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  private extractText(chunk: any): string {
    if (chunk.type === 'content_block_start') {
      return chunk.content_block.text;
    } else if (chunk.type === 'content_block_delta') {
      return chunk.delta.text;
    }
    return '';
  }
}