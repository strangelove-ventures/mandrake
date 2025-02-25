# Provider

## Overview

The Provider package is a unified interface for interacting with various LLM services in Mandrake. It provides a consistent API for message creation, token usage tracking, and cost calculation across different model providers like Anthropic and Ollama. This package abstracts away the implementation details of each provider's API, allowing the rest of Mandrake to work with models in a standardized way.

## Core Concepts

### BaseProvider

An abstract class that serves as the foundation for all provider implementations. It handles common functionality like configuration validation, model information retrieval, and cost calculation.

### Provider Implementations

Concrete implementations of `BaseProvider` for specific LLM services:

- `AnthropicProvider`: For Claude models via Anthropic's API
- `OllamaProvider`: For locally-hosted models via Ollama

### Message Streaming

All providers support streaming responses with standardized message chunks, including:

- `TextChunk`: Contains text content from the model
- `UsageChunk`: Contains token usage information

### Factory Pattern

The `createProvider` function allows for easy instantiation of the appropriate provider based on the provider type and configuration.

## Architecture

```sh
provider/
├── base.ts         # Abstract BaseProvider class
├── factory.ts      # Provider factory function
├── errors.ts       # Provider-specific error classes
├── types.ts        # Common types and interfaces
└── providers/      # Provider implementations
    ├── anthropic.ts
    └── ollama.ts
```

The package depends on `@mandrake/utils` for model information and schemas, and integrates with model-specific client libraries like `@anthropic-ai/sdk` and `ollama`.

## Usage

### Basic Provider Creation and Usage

```typescript
import { createProvider } from '@mandrake/provider';
import { ProviderType } from '@mandrake/utils';

// Create a provider
const provider = createProvider('anthropic', {
  modelId: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Get model information
const model = provider.getModel();
console.log(`Using model: ${model.id}`);

// Stream a response
const messageStream = await provider.createMessage(
  'You are a helpful assistant.',
  [{ role: 'user', content: 'Hello, how are you?' }]
);

// Process the stream
for await (const chunk of messageStream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.text);
  } else if (chunk.type === 'usage') {
    console.log(
      `\nToken usage: ${chunk.inputTokens} input, ${chunk.outputTokens} output`
    );
    const cost = provider.calculateCost(chunk.inputTokens, chunk.outputTokens);
    console.log(`Estimated cost: $${cost.toFixed(6)}`);
  }
}
```

### Handling Errors

```typescript
import { 
  createProvider, 
  NetworkError, 
  RateLimitError, 
  TokenLimitError 
} from '@mandrake/provider';

try {
  const provider = createProvider('anthropic', { 
    modelId: 'claude-3-opus-20240229',
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const stream = await provider.createMessage(
    'You are a helpful assistant.',
    [{ role: 'user', content: 'Write a short story.' }]
  );
  
  for await (const chunk of stream) {
    // Process chunks
  }
} catch (error) {
  if (error instanceof TokenLimitError) {
    console.error('Token limit exceeded. Try a shorter prompt or different model.');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit reached. Please try again later.');
  } else if (error instanceof NetworkError) {
    console.error('API connection error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Key Interfaces

### BaseProvider Interface

```typescript
abstract class BaseProvider {
  constructor(config: ProviderConfig);
  abstract createMessage(systemPrompt: string, messages: Message[]): MessageStream;
  getModel(): { id: string; info: ModelInfo };
  calculateCost(inputTokens: number, outputTokens: number): number;
}
```

### Message Types

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type MessageStream = AsyncGenerator<MessageStreamChunk>;

type MessageStreamChunk = TextChunk | UsageChunk;

interface TextChunk {
  type: 'text';
  text: string;
}

interface UsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
}
```

### Provider Configuration

```typescript
interface ProviderConfig {
  modelId: string;
  modelInfo: ModelInfo;
  apiKey?: string;
  baseUrl?: string;
}
```

## Integration Points

- **@mandrake/utils**: Uses model information and provider types from the utils package
- **@mandrake/session**: Provider instances are used by the session package to generate responses
- **@mandrake/workspace**: Provider configuration comes from workspace settings
- **External APIs**: Connects to external services (Anthropic API) and local services (Ollama)

The Provider package serves as a critical adapter layer in Mandrake's architecture, allowing the application to work with multiple LLM services through a unified interface while handling the complexity of different APIs, streaming protocols, and error conditions.
