# Additional Provider Implementations

For each provider we'll follow the pattern established with Anthropic: a provider class extending BaseProvider that handles the specifics of that API's streaming implementation.

## Gemini Provider

```typescript
// src/providers/gemini.ts
export class GeminiProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
    // Initialize Google Gemini client
  }

  async *createMessage(
    systemPrompt: string, 
    messages: Message[]
  ): MessageStream {
    // Convert messages to Gemini format
    // Stream responses
    // Handle content and usage data
  }
}
```

Key considerations:

- Uses @google/generative-ai SDK
- Requires handling system prompts differently (no native support)
- Different token counting methodology
- Different streaming format

## Ollama Provider

```typescript
// src/providers/ollama.ts
export class OllamaProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
    // Setup Ollama client configuration
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream {
    // Convert to Ollama message format
    // Handle local API communication
    // Stream responses
  }
}
```

Key considerations:

- Local API interaction
- Different response format
- May need custom HTTP client rather than SDK
- Potential local network errors to handle

## OpenAI Provider

```typescript
// src/providers/openai.ts
export class OpenAIProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
    // Initialize OpenAI client
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream {
    // Convert to OpenAI chat format
    // Stream responses
    // Handle usage information
  }
}
```

Key considerations:

- Uses openai npm package
- Similar streaming to Anthropic
- Different token counting/pricing structure
- Handle both API versions

## DeepSeek Provider

```typescript
// src/providers/deepseek.ts
export class DeepSeekProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
    // Initialize DeepSeek client
  }

  async *createMessage(
    systemPrompt: string,
    messages: Message[]
  ): MessageStream {
    // Convert to DeepSeek format
    // Stream responses
    // Handle usage data
  }
}
```

Key considerations:

- Similar to OpenAI API structure
- Different token limits
- Unique model capabilities to consider

## Implementation Order & Testing

1. OpenAI
   - Most mature API
   - Well-documented streaming
   - Good reference for other implementations

2. Ollama
   - Local testing possible
   - No API key needed
   - Good for development

3. Gemini
   - Growing in popularity
   - Different message format challenge

4. DeepSeek
   - Similar to OpenAI
   - Can leverage previous work

For each provider, create:

1. Provider implementation
2. Integration tests matching Anthropic pattern
3. Provider-specific error handling
4. Token counting adaptations
5. Documentation of provider-specific behaviors

## Testing Strategy

Each provider should maintain the same test structure:

```typescript
describe('Provider', () => {
  test('streams responses with usage info', async () => {
    // Test basic streaming
  });

  test('handles API errors', async () => {
    // Test error conditions
  });

  test('handles multiple messages', async () => {
    // Test conversation flow
  });

  test('respects maxTokens from config', async () => {
    // Test token limits
  });
});
```

## Dependencies to Add

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.1.0",
    "openai": "^4.0.0"
    // Ollama and DeepSeek may use fetch directly
  }
}
```

## Next Steps

1. Create provider files
2. Implement OpenAI first as reference
3. Add dependencies
4. Write test suites
5. Implement remaining providers
6. Document provider-specific behaviors
