import { BaseProvider } from '../base';
import type { Message, MessageStream, ProviderConfig } from '../types';
import { NetworkError, RateLimitError, TokenLimitError } from '../errors';

interface XAIMessage {
  role: string;
  content: string;
}

interface XAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class XAIProvider extends BaseProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);
    
    if (!config.apiKey) {
      this.logger.error('XAI API key is required');
      throw new Error('XAI API key is required');
    }
    
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.x.ai/v1';
    
    this.logger.debug('XAI client initialized', { baseUrl: this.baseUrl });
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream {
    this.logger.debug('Creating message with XAI', {
      modelId: this.config.modelId,
      maxTokens: this.config.modelInfo.maxTokens,
      messagesCount: messages.length,
      systemPromptLength: systemPrompt.length
    });

    try {
      // Format messages for XAI API
      const formattedMessages: XAIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...this.convertMessages(messages)
      ];

      // API request parameters
      const requestBody = {
        model: this.config.modelId, // e.g., "grok-beta"
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: this.config.modelInfo.maxTokens,
        stream: true
      };

      this.logger.debug('Sending request to XAI API', { 
        endpoint: `${this.baseUrl}/chat/completions`,
        model: this.config.modelId,
        system_len: systemPrompt.length,
        message_count: messages.length
      });

      // Create fetch request
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error('XAI API response error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });

        if (response.status === 429) {
          throw new RateLimitError('XAI API rate limit exceeded');
        } 
        
        if (response.status === 413) {
          throw new TokenLimitError('XAI API token limit exceeded');
        }
        
        throw new NetworkError(`XAI API error: ${response.status} ${response.statusText}`);
      }

      // Ensure we have a readable stream
      if (!response.body) {
        throw new NetworkError('XAI API returned empty response body');
      }

      this.logger.debug('Stream created with XAI API');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let inputTokenCount = 0;
      let outputTokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.logger.debug('XAI stream completed');
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';  // Keep the last incomplete line in the buffer

        for (const line of lines) {
          // Skip empty lines or [DONE] markers
          if (!line.trim() || line.includes('[DONE]')) continue;
          
          // Handle SSE format (remove 'data: ' prefix)
          const dataLine = line.startsWith('data: ') ? line.slice(6) : line;
          
          try {
            const chunk: XAIStreamChunk = JSON.parse(dataLine);
            
            // Process chunk
            if (chunk.choices && chunk.choices.length > 0) {
              const choice = chunk.choices[0];
              
              if (choice.delta.content) {
                this.logger.debug('Content chunk received', {
                  contentLength: choice.delta.content.length
                });
                
                yield {
                  type: 'text',
                  text: choice.delta.content
                };
              }
            }
            
            // Handle usage information
            if (chunk.usage) {
              const usage = {
                inputTokens: chunk.usage.prompt_tokens,
                outputTokens: chunk.usage.completion_tokens
              };
              
              // Update token counts
              inputTokenCount = usage.inputTokens;
              outputTokenCount = usage.outputTokens;
              
              this.logger.debug('Usage info', usage);
              
              yield {
                type: 'usage',
                ...usage
              };
            }
          } catch (parseError) {
            this.logger.warn('Failed to parse XAI stream chunk', {
              error: (parseError as Error).message,
              chunk: dataLine
            });
          }
        }
      }
      
      // If no usage info was provided in the stream, provide final usage estimate
      if (inputTokenCount === 0 || outputTokenCount === 0) {
        this.logger.debug('Providing final usage information');
        
        // If we didn't get usage info from the API, we still need to provide it
        yield {
          type: 'usage',
          inputTokens: inputTokenCount || 100, // Fallback estimate
          outputTokens: outputTokenCount || 50  // Fallback estimate
        };
      }
      
      this.logger.debug('Message creation completed successfully');
    } catch (error: any) {
      if (error instanceof RateLimitError || error instanceof TokenLimitError) {
        throw error;
      }
      
      this.logger.error('XAI API error', {
        error: error.message,
        stack: error.stack
      });
      
      throw new NetworkError('XAI API error', error);
    }
  }

  private convertMessages(messages: Message[]): XAIMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}