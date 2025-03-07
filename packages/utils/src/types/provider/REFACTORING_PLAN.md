# Provider Package Type Refactoring Plan

## Overview

This plan focuses on extracting and reorganizing the types from the provider package into the utils package. The provider package contains types related to LLM providers, models, and provider-specific implementations that should be made available as shared types.

## Types to Extract

Based on the initial review of the provider package, we need to extract the following types:

### Base Provider Types
- Provider interfaces
- Common provider functionality
- Provider factory types

### Model Types
- Model definitions
- Model capabilities
- Model configurations

### Provider-Specific Types
- Anthropic provider types
- Ollama provider types
- XAI provider types
- Other provider-specific interfaces

## Implementation Steps

### 1. Base Provider Types

Examine the source files:
- `packages/provider/src/base.ts`
- `packages/provider/src/factory.ts`
- `packages/provider/src/errors.ts`
- `packages/provider/src/types.ts`

Create the type definitions in:
`packages/utils/src/types/provider/base.ts`

### 2. Model Types

Examine the source files:
- `packages/provider/src/types.ts`
- Any model-specific definitions

Create the type definitions in:
`packages/utils/src/types/provider/models.ts`

### 3. Anthropic Provider Types

Examine the source files:
- `packages/provider/src/providers/anthropic.ts`

Create the type definitions in:
`packages/utils/src/types/provider/anthropic.ts`

### 4. Ollama Provider Types

Examine the source files:
- `packages/provider/src/providers/ollama.ts`

Create the type definitions in:
`packages/utils/src/types/provider/ollama.ts`

### 5. XAI Provider Types

Examine the source files:
- `packages/provider/src/providers/xai.ts`

Create the type definitions in:
`packages/utils/src/types/provider/xai.ts`

## Testing Process

After implementing each section:

1. Update the exports in `packages/utils/src/types/provider/index.ts`
2. Test the build with `bun run build` in the utils package
3. Update imports in the provider package to use the new types
4. Test the build with `bun run build` in the provider package

## Next Steps

1. Start with the base provider types
2. Move on to model types
3. Implement provider-specific types (Anthropic, Ollama, XAI)
4. Test and validate
