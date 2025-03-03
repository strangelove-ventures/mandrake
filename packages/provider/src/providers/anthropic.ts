import { Anthropic } from '@anthropic-ai/sdk';
import { BaseProvider } from '../base';
import type { Message, MessageStream, ProviderConfig } from '../types';
import { NetworkError, RateLimitError, TokenLimitError } from '../errors';

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      this.logger.error('Anthropic API key is required');
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
    this.logger.debug('Anthropic client initialized', { baseUrl: config.baseUrl });
  }

  async *createMessage(
    systemPrompt: string, 
    messages: Message[]
  ): MessageStream {
    this.logger.debug('Creating message with Anthropic', {
      modelId: this.config.modelId,
      maxTokens: this.config.modelInfo.maxTokens,
      messagesCount: messages.length,
      systemPromptLength: systemPrompt.length
    });

    try {
      const stream = await this.client.messages.create({
        model: this.config.modelId,
        max_tokens: this.config.modelInfo.maxTokens,
        system: systemPrompt,
        messages: this.convertMessages(messages),
        stream: true
      });

      this.logger.debug('Stream created with Anthropic');
      
      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'message_start': {
            if (chunk.message.usage) {
              const usage = {
                inputTokens: chunk.message.usage.input_tokens || 0,
                outputTokens: chunk.message.usage.output_tokens || 0
              };
              
              this.logger.debug('Message start usage', usage);
              
              yield {
                type: 'usage',
                ...usage
              };
            }
            break;
          }

          case 'content_block_start':
          case 'content_block_delta': {
            const text = this.extractText(chunk);
            if (text) {
              this.logger.debug('Content chunk received', { 
                chunkType: chunk.type,
                textLength: text.length 
              });
              
              yield {
                type: 'text',
                text
              };
            }
            break;
          }

          case 'message_delta': {
            if (chunk.usage) {
              const usage = {
                inputTokens: 0,
                outputTokens: chunk.usage.output_tokens || 0
              };
              
              this.logger.debug('Message delta usage', usage);
              
              yield {
                type: 'usage',
                ...usage
              };
            }
            break;
          }
        }
      }
      
      this.logger.debug('Message creation completed successfully');
    } catch (error: any) {
      if (error.status === 429) {
        this.logger.error('Rate limit exceeded', { error: error.message });
        throw new RateLimitError(error.message);
      }
      if (error.status === 413) {
        this.logger.error('Token limit exceeded', { error: error.message });
        throw new TokenLimitError(error.message);
      }
      this.logger.error('Anthropic API error', { 
        error: error.message,
        status: error.status,
        stack: error.stack
      });
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