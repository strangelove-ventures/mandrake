# Provider Package Implementation Plan

## Overview

Create a lean provider package that handles direct LLM API interaction with a focus on:

- Message streaming with proper typing
- Token counting and cost calculation
- Efficient stream processing
- Anthropic API integration

## Directory Structure

```
packages/provider/
├── src/
│   ├── index.ts              # Main exports
│   ├── base.ts               # Base provider interface/class
│   ├── types.ts              # Core type definitions  
│   ├── constants.ts          # Model configurations
│   ├── errors.ts             # Custom error types
│   ├── providers/
│   │   └── anthropic.ts      # Anthropic implementation
│   └── stream/
│       └── types.ts          # Stream chunk types
└── tests/
    ├── integration/
    │   └── anthropic.test.ts # Full provider tests
    └── unit/
        ├── base.test.ts      # Base provider tests  
        └── types.test.ts     # Type validation tests
```

## Core Types

```typescript
// types.ts

export interface Message {
  role: 'user' | 'assistant';
  content: string; 
}

export type MessageStream = AsyncGenerator<MessageStreamChunk>;

export type MessageStreamChunk = TextChunk | UsageChunk;

export interface TextChunk {
  type: 'text';
  text: string;
}

export interface UsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

export interface ModelInfo {
  maxTokens?: number;
  contextWindow?: number;
  supportsImages?: boolean;
  inputPrice?: number;
  outputPrice?: number;
  cacheWritesPrice?: number;
  cacheReadsPrice?: number;
}

export interface ProviderConfig {
  modelId: string;
  modelInfo: ModelInfo;
  apiKey?: string;
  baseUrl?: string;
}

// For workspace models.json
export interface ModelsConfig {
  active: string;
  models: Record<string, {
    enabled: boolean;
    provider: string; 
    providerConfig: ProviderConfig;
  }>;
}
```

## Error Types

```typescript
// errors.ts

export class ProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class TokenLimitError extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'TokenLimitError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends ProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'NetworkError';
  }
}
```

## Base Provider

```typescript
// base.ts

import type { Message, MessageStream, ProviderConfig } from './types';
import { ProviderError } from './errors';

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  abstract createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream;

  getModel() {
    return {
      id: this.config.modelId,
      info: this.config.modelInfo
    };
  }

  protected calculateCost(
    inputTokens: number,
    outputTokens: number,
    cacheWriteTokens?: number,
    cacheReadTokens?: number
  ): number {
    const {
      inputPrice = 0,
      outputPrice = 0,
      cacheWritesPrice = 0,
      cacheReadsPrice = 0
    } = this.config.modelInfo;

    return (
      (inputPrice / 1_000_000) * inputTokens +
      (outputPrice / 1_000_000) * outputTokens +
      (cacheWriteTokens ? (cacheWritesPrice / 1_000_000) * cacheWriteTokens : 0) +
      (cacheReadTokens ? (cacheReadsPrice / 1_000_000) * cacheReadTokens : 0)
    );
  }

  private validateConfig(config: ProviderConfig) {
    if (!config.modelId) {
      throw new ProviderError('Model ID is required');
    }
    if (!config.modelInfo) {
      throw new ProviderError('Model info is required');
    }
  }
}
```

## Anthropic Implementation

```typescript
// providers/anthropic.ts

import { Anthropic } from '@anthropic-ai/sdk';
import { BaseProvider } from '../base';
import type { Message, MessageStream } from '../types';
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
        max_tokens: this.config.modelInfo.maxTokens,
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
                cacheWriteTokens: chunk.message.usage.cache_creation_input_tokens,
                cacheReadTokens: chunk.message.usage.cache_read_input_tokens
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
```

## Testing Strategy

### Unit Tests (src/base.test.ts)

```typescript
describe('BaseProvider', () => {
  describe('constructor', () => {
    test('validates required config fields', () => {
      expect(() => new TestProvider({} as any))
        .toThrow('Model ID is required');
    });
  });

  describe('calculateCost', () => {
    test('calculates basic input/output costs', () => {
      const provider = new TestProvider({
        modelId: 'test',
        modelInfo: {
          inputPrice: 15,
          outputPrice: 75
        }
      });

      const cost = provider.calculateCost(100, 200);
      expect(cost).toBe((15 * 100 + 75 * 200) / 1_000_000);
    });

    test('includes cache costs when provided', () => {
      const provider = new TestProvider({
        modelId: 'test',
        modelInfo: {
          inputPrice: 15,
          outputPrice: 75,
          cacheWritesPrice: 5,
          cacheReadsPrice: 2
        }
      });

      const cost = provider.calculateCost(100, 200, 50, 25);
      expect(cost).toBe(
        (15 * 100 + 75 * 200 + 5 * 50 + 2 * 25) / 1_000_000
      );
    });
  });
});
```

### Integration Tests (anthropic.test.ts)

```typescript
describe('AnthropicProvider', () => {
  const provider = new AnthropicProvider({
    modelId: 'claude-3-opus-20240229',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    modelInfo: {
      inputPrice: 15,
      outputPrice: 75
    }
  });

  test('streams responses with usage info', async () => {
    const stream = provider.createMessage(
      'You are a helpful assistant',
      [{
        role: 'user',
        content: 'Write a haiku about programming.'
      }]
    );

    const chunks: MessageStreamChunk[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Should have usage chunks
    expect(chunks.some(c => c.type === 'usage')).toBe(true);

    // Should have text chunks
    const textChunks = chunks.filter(c => c.type === 'text');
    expect(textChunks.length).toBeGreaterThan(0);

    // Combined text should form valid haiku
    const fullText = textChunks
      .map(c => (c as TextChunk).text)
      .join('');
    expect(fullText).toContain('\n');
  });

  test('handles rate limits', async () => {
    // Create many concurrent requests
    const promises = Array(10).fill(0).map(() => 
      provider.createMessage(
        'You are a helpful assistant',
        [{ role: 'user', content: 'Hello' }]
      )
    );

    await expect(Promise.all(promises))
      .rejects
      .toThrow(RateLimitError);
  });

  test('handles token limits', async () => {
    const longText = 'x'.repeat(100000);
    
    await expect(provider.createMessage(
      'You are a helpful assistant',
      [{ role: 'user', content: longText }]
    )).rejects.toThrow(TokenLimitError);
  });
});
```

## Implementation Steps

1. Core Types & Errors (1 day)
   - Message types
   - Stream types
   - Error classes
   - Unit tests

2. Base Provider (1 day)  
   - Abstract base class
   - Config validation
   - Cost calculation
   - Unit tests

3. Stream Processing (2 days)
   - Stream type implementation
   - Chunk processing
   - Memory handling
   - Unit tests

4. Anthropic Integration (2 days)
   - API client setup  
   - Message conversion
   - Error handling
   - Integration tests

5. Testing & Documentation (1 day)
   - Complete test coverage
   - API documentation
   - Usage examples

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.26.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "bun-types": "latest",
    "@types/node": "^20.0.0"
  }
}
```

## Key Technical Decisions

1. **Error Handling**
   - Custom error hierarchy for different failure modes
   - Detailed error messages with underlying causes
   - Proper error propagation through async streams

2. **Stream Processing**
   - Efficient memory usage in async generators
   - Clear type discrimination for chunks
   - Proper cleanup of API resources

3. **Testing Strategy**
   - Extensive integration testing with real API
   - Unit tests for core logic
   - Error case coverage
   - Stream processing validation

4. **API Design**
   - Simple, focused interface
   - Clear type definitions
   - Provider-agnostic where possible
   - Efficient token/cost tracking
