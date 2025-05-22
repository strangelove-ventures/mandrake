# Utils

## Overview

The Utils package provides shared utilities, types, and constants used across the Mandrake project. It serves as the foundation for common functionality including logging, error handling, model definitions, and shared schemas.

## Core Components

### Logger

A lightweight logging utility that provides:

- Multiple log levels (debug, info, warn, error)
- Formatted output with timestamps
- Configurable verbosity
- Consistent logging interface across packages

### Model Definitions

Comprehensive model information including:

- Model IDs and display names
- Context window sizes
- Token pricing information
- Provider associations
- Model capabilities

### Provider Types

Enumeration and utilities for supported LLM providers:

- Anthropic (Claude models)
- Ollama (local models)
- Type guards and validation

### Shared Schemas

Zod schemas for common data structures:

- Tool definitions
- Model configurations
- Provider settings
- Response formats

### Error Utilities

Base error classes and error handling patterns used throughout the project.

## Architecture

```sh
utils/
├── logger.ts           # Logging utility
├── models.ts           # Model definitions and info
├── providers.ts        # Provider type definitions
├── schemas.ts          # Shared Zod schemas
├── errors.ts           # Error base classes
├── types.ts            # Common TypeScript types
└── index.ts            # Main exports
```

## Usage

### Logger

```typescript
import { Logger } from '@mandrake/utils';

// Create a logger instance
const logger = new Logger('MyComponent');

// Use different log levels
logger.debug('Detailed debug information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred:', error);

// Configure log level
logger.setLevel('warn'); // Only warn and error will be shown
```

### Model Information

```typescript
import { getModelInfo, modelInfo, ModelId } from '@mandrake/utils';

// Get information for a specific model
const claudeInfo = getModelInfo('claude-3-5-sonnet-20241022');
console.log(`Context window: ${claudeInfo.contextWindow}`);
console.log(`Input cost: $${claudeInfo.inputCost} per million tokens`);

// List all available models
Object.entries(modelInfo).forEach(([id, info]) => {
  console.log(`${info.displayName} (${id})`);
  console.log(`  Provider: ${info.provider}`);
  console.log(`  Context: ${info.contextWindow} tokens`);
});

// Type-safe model ID usage
const modelId: ModelId = 'claude-3-5-sonnet-20241022';
```

### Provider Types

```typescript
import { ProviderType, isValidProvider } from '@mandrake/utils';

// Use provider types
const provider: ProviderType = 'anthropic';

// Validate provider strings
if (isValidProvider(userInput)) {
  // userInput is now typed as ProviderType
  console.log(`Valid provider: ${userInput}`);
}

// Get provider from model
const modelProvider = getModelInfo('claude-3-opus-20240229').provider;
```

### Shared Schemas

```typescript
import { ToolSchema, ModelConfigSchema } from '@mandrake/utils/schemas';

// Validate tool definition
const toolResult = ToolSchema.safeParse({
  name: 'readFile',
  description: 'Read contents of a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  }
});

if (toolResult.success) {
  console.log('Valid tool:', toolResult.data);
} else {
  console.error('Invalid tool:', toolResult.error);
}

// Parse model configuration
const modelConfig = ModelConfigSchema.parse({
  provider: 'anthropic',
  modelId: 'claude-3-5-sonnet-20241022',
  apiKey: 'sk-...',
  temperature: 0.7
});
```

### Error Handling

```typescript
import { BaseError, ValidationError } from '@mandrake/utils/errors';

// Create custom errors
class CustomError extends BaseError {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CustomError';
  }
}

// Use validation errors
function validateInput(input: unknown) {
  if (!input) {
    throw new ValidationError('Input is required');
  }
}

// Error handling with proper types
try {
  validateInput(null);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.error('Validation failed:', error.message);
  }
}
```

## Key Exports

### Types

```typescript
// Model types
export type ModelId = string;
export interface ModelInfo {
  id: string;
  displayName: string;
  contextWindow: number;
  inputCost: number;
  outputCost: number;
  provider: ProviderType;
}

// Provider types
export type ProviderType = 'anthropic' | 'ollama';

// Tool types
export interface Tool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

// Common types
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}
```

### Constants

```typescript
// Available model IDs
export const MODEL_IDS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  // ... other models
] as const;

// Provider names
export const PROVIDERS = ['anthropic', 'ollama'] as const;
```

### Utilities

```typescript
// Model utilities
export function getModelInfo(modelId: string): ModelInfo;
export function getModelsByProvider(provider: ProviderType): ModelInfo[];
export function isValidModelId(id: string): boolean;

// Provider utilities  
export function isValidProvider(provider: string): provider is ProviderType;
export function getProviderModels(provider: ProviderType): string[];

// Schema utilities
export function validateTool(tool: unknown): Tool;
export function validateModelConfig(config: unknown): ModelConfig;
```

## Best Practices

1. **Use Type Guards**: Leverage the provided type guards for runtime validation
2. **Import Schemas**: Use Zod schemas for data validation instead of manual checks
3. **Centralized Logging**: Use the Logger class for consistent output
4. **Model Constants**: Reference model IDs from constants rather than strings
5. **Error Classes**: Extend BaseError for custom error types

## Future Enhancements

- Additional model providers (OpenAI, etc.)
- Enhanced logging with log levels and destinations
- More comprehensive schema definitions
- Performance utilities and benchmarking
- Type-safe event emitters
- Configuration management utilities
