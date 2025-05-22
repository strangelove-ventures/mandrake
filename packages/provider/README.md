# Provider

> **⚠️ FLAGGED FOR MAJOR REFACTOR**
> 
> This package is scheduled for a complete refactor as part of the CLI transformation. The new design will include:
> - Plugin-style architecture for easier extension
> - Unified streaming interface across all providers
> - Better error handling and retry logic
> - Simplified configuration
> - Study Cline's provider implementation for inspiration

## Overview

The Provider package provides a unified interface for interacting with various LLM services. It abstracts away the implementation details of each provider's API, allowing consistent usage across different model providers like Anthropic and Ollama.

## Core Concepts

### BaseProvider

An abstract class that serves as the foundation for all provider implementations. It handles:

- Configuration validation
- Model information retrieval
- Cost calculation
- Common functionality across providers

### Provider Implementations

Concrete implementations of `BaseProvider` for specific LLM services:

- `AnthropicProvider`: For Claude models via Anthropic's API
- `OllamaProvider`: For locally-hosted models via Ollama

### Message Streaming

All providers support streaming responses with standardized message chunks:

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

## Usage

### Basic Provider Creation

```typescript
import { createProvider } from '@mandrake/provider';

// Create an Anthropic provider
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
    console.log(`\nTokens: ${chunk.inputTokens} in, ${chunk.outputTokens} out`);
    const cost = provider.calculateCost(chunk.inputTokens, chunk.outputTokens);
    console.log(`Cost: $${cost.toFixed(6)}`);
  }
}
```

### Error Handling

```typescript
import { 
  createProvider, 
  NetworkError, 
  RateLimitError, 
  TokenLimitError 
} from '@mandrake/provider';

try {
  const provider = createProvider('anthropic', config);
  const stream = await provider.createMessage(systemPrompt, messages);
  
  for await (const chunk of stream) {
    // Process chunks
  }
} catch (error) {
  if (error instanceof TokenLimitError) {
    console.error('Token limit exceeded');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit reached');
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  }
}
```

## Key Interfaces

### BaseProvider

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

## Error Types

- `ProviderError`: Base error class
- `ConfigurationError`: Invalid configuration
- `NetworkError`: API connection issues
- `AuthenticationError`: Invalid credentials
- `RateLimitError`: Rate limit exceeded
- `TokenLimitError`: Token limit exceeded

## Planned Improvements

The upcoming refactor will address current limitations:

1. **Plugin Architecture**: Make it easier to add new providers without modifying core code
2. **Unified Streaming**: Standardize streaming behavior across all providers
3. **Better Configuration**: Simplify provider setup and configuration
4. **Enhanced Error Handling**: Implement automatic retries with backoff
5. **Tool Support**: Better integration with tool calling capabilities
6. **Context Management**: Centralized context window tracking
7. **Testing**: Improved testability with mock providers

## Current Limitations

- Limited to Anthropic and Ollama providers
- No automatic retry logic
- Basic error handling
- No caching mechanism
- Simple cost calculation
- No support for advanced features like function calling
