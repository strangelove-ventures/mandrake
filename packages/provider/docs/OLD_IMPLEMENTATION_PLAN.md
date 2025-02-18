# Provider Package Implementation Plan

## Overview

The provider package handles LLM interactions using an approach adapted from Cline's implementation. We'll implement our own versions of their core functionality, starting with Anthropic support.

## Directory Structure

```sh
packages/provider/
├── src/
│   ├── index.ts                # Public exports
│   ├── types.ts                # Core interfaces and types
│   ├── config.ts               # Provider configuration types
│   ├── base.ts                 # Base provider implementation
│   ├── manager.ts              # Provider manager
│   ├── stream/                 # Streaming functionality 
│   │   ├── index.ts           # Stream types
│   │   ├── parser.ts          # Message parsing
│   │   └── chunks.ts          # Stream chunk handling
│   ├── providers/             
│   │   └── anthropic.ts       # Anthropic implementation
│   └── utils/
│       ├── tokens.ts          # Token counting
│       └── costs.ts           # Cost calculation
└── tests/
    ├── integration/          
    │   └── anthropic.test.ts   # Full integration tests
    └── unit/                  
        ├── parser.test.ts
        ├── stream.test.ts 
        └── costs.test.ts
```

## Core Types & Interfaces

### Stream Types

```typescript
// stream/index.ts
export type ProviderStream = AsyncGenerator<ProviderStreamChunk>;

export type ProviderStreamChunk = 
  | ProviderStreamTextChunk 
  | ProviderStreamToolChunk
  | ProviderStreamUsageChunk;

export interface ProviderStreamTextChunk {
  type: 'text';
  text: string;
}

export interface ProviderStreamToolChunk {
  type: 'tool';
  name: string;
  params: Record<string, string>;
}

export interface ProviderStreamUsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}
```

### Provider Configuration

```typescript
// config.ts
export interface ModelInfo {
  maxTokens?: number;
  contextWindow?: number;
  supportsImages?: boolean;
  supportsTools: boolean;
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

// From workspace models.json
export interface ModelsConfig {
  active: string;
  models: Record<string, {
    enabled: boolean;
    provider: string;
    providerConfig: ProviderConfig;
  }>;
}
```

### Provider Interface

```typescript
// types.ts
import { MCPTool } from '@mandrake/mcp';
import { ProviderStream } from './stream';

export interface Provider {
  createMessage(
    systemPrompt: string,
    messages: Message[], 
    tools?: MCPTool[]
  ): ProviderStream;

  getModel(): {
    id: string;
    info: ModelInfo;
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  output: string;
  error?: string;
}
```

### Message Parser

Adapted from Cline's tool call parsing:

```typescript
// stream/parser.ts
export interface ParsedBlock {
  type: 'text' | 'tool';
  content?: string;
  toolName?: string;
  toolParams?: Record<string, string>;
  partial: boolean;
}

export function parseMessage(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let currentBlock: ParsedBlock | undefined;
  let currentParam: string | undefined;
  let accumulator = '';

  // Similar logic to Cline's parser but adapted for our needs
  // Handle tool tags, params, and text content
  
  return blocks;
}
```

### Base Provider

```typescript
// base.ts
export abstract class BaseProvider implements Provider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract createMessage(
    systemPrompt: string,
    messages: Message[],
    tools?: MCPTool[]
  ): ProviderStream;

  getModel(): { id: string; info: ModelInfo } {
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
    // Implementation adapted from Cline's cost calculation
  }
}
```

### Provider Manager

```typescript
// manager.ts
export class ProviderManager {
  private config: ModelsConfig;
  private providers: Map<string, Provider>;

  constructor(config: ModelsConfig) {
    this.config = config;
    this.providers = new Map();
  }

  async initializeProvider(modelId: string): Promise<void> {
    const modelConfig = this.config.models[modelId];
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found`);
    }

    const provider = new AnthropicProvider(modelConfig.providerConfig);
    this.providers.set(modelId, provider);
  }

  getProvider(modelId: string): Provider {
    const provider = this.providers.get(modelId);
    if (!provider) {
      throw new Error(`Provider not initialized for model ${modelId}`);
    }
    return provider;
  }

  getActiveProvider(): Provider {
    return this.getProvider(this.config.active);
  }
}
```

### Anthropic Implementation

```typescript
// providers/anthropic.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { BaseProvider } from '../base';
import { parseMessage } from '../stream/parser';

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[],
    tools?: MCPTool[]
  ): ProviderStream {
    // Convert tools to Anthropic format
    const anthropicTools = tools?.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    const stream = await this.client.messages.create({
      model: this.config.modelId,
      system: systemPrompt,
      messages,
      tools: anthropicTools,
      stream: true
    });

    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'content_block_start':
        case 'content_block_delta': {
          // Parse content for tool calls using our parser
          const blocks = parseMessage(chunk.content);
          for (const block of blocks) {
            if (block.type === 'text') {
              yield {
                type: 'text',
                text: block.content!
              };
            } else {
              yield {
                type: 'tool',
                name: block.toolName!,
                params: block.toolParams!
              };
            }
          }
          break;
        }
        case 'message_delta': {
          yield {
            type: 'usage',
            inputTokens: chunk.usage.input_tokens || 0,
            outputTokens: chunk.usage.output_tokens || 0,
            cacheWriteTokens: chunk.usage.cache_write_tokens,
            cacheReadTokens: chunk.usage.cache_read_tokens
          };
          break;
        }
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. Message Parser

```typescript
// tests/unit/parser.test.ts
import { describe, test, expect } from "bun:test";
import { parseMessage } from "../../src/stream/parser";

describe("parseMessage", () => {
  test("parses text content", () => {
    const input = "Hello world";
    const blocks = parseMessage(input);
    expect(blocks).toEqual([{
      type: "text",
      content: "Hello world",
      partial: false
    }]);
  });

  test("parses tool calls", () => {
    const input = `<use_mcp_tool>
<server_name>git</server_name>
<tool_name>status</tool_name>
</use_mcp_tool>`;
    const blocks = parseMessage(input);
    expect(blocks).toEqual([{
      type: "tool",
      toolName: "use_mcp_tool",
      toolParams: {
        server_name: "git",
        tool_name: "status"
      },
      partial: false
    }]);
  });
});
```

1. Stream Processing

- Test chunk handling
- Test partial tool calls
- Test usage metrics

### Integration Tests

```typescript
// tests/integration/anthropic.test.ts
describe("AnthropicProvider", () => {
  test("streams responses with tool calls", async () => {
    const provider = new AnthropicProvider({
      modelId: "claude-3-opus-20240229",
      // Test config
    });

    const stream = provider.createMessage(
      "You are a helpful assistant",
      [{
        role: "user",
        content: "What's in the current directory?"
      }],
      [{ 
        name: "list_files",
        // Tool definition
      }]
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks).toContainEqual({
      type: "tool",
      name: "list_files",
      params: { path: "." }
    });
  });
});
```

## Implementation Steps

1. Core Stream Processing

- Implement stream types
- Port message parser
- Add chunk handling

1. Base Functionality  

- Implement base provider
- Add cost calculation
- Add token counting

1. Anthropic Integration

- Add Anthropic client
- Handle tool conversion
- Implement streaming

1. Testing

- Add parser tests
- Add stream tests
- Add integration tests

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.17.1",
    "@mandrake/mcp": "workspace:*",
    "@mandrake/utils": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "bun-types": "latest"
  }
}
```

## Key Points

1. **Stream Processing**

- Adapt Cline's parser for our needs
- Keep streaming efficient
- Handle partial tool calls properly

1. **Tool Integration**  

- XML-style tool call format
- Robust param parsing
- Clean tool conversion for API

1. **Error Handling**

- Rate limits
- Token limits
- Network errors
- Invalid tool calls

1. **Performance**

- Efficient streaming
- Clean cleanup
- Memory management

1. **Testing**

- Real API calls
- Mock tools
- Edge cases
