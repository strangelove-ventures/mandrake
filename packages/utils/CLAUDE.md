# Mandrake Utils Package Development Guide

## Commands
- Build package: `bun run build`
- Run all tests: `bun test`
- Run specific test: `bun test tests/tokenization.test.ts`
- Run by pattern: `bun test --test-name-pattern "Token Counters"`
- Run focused tests: `bun test --only` (with test.only() in test file)
- Clean build: `bun run clean`

## Project Structure
- `src/index.ts`: Logging utilities and package exports
- `src/models/models.ts`: Model information and provider configurations
- `src/models/tokenization.ts`: Token counting for different LLM providers
- `src/models/schemas.ts`: Shared type schemas for providers and models
- `src/common-types.ts`: Shared type definitions used across packages

## Code Style
- **Imports**: External dependencies first, then internal modules
- **TypeScript**: Use strict typing with interfaces and type guards
- **Error Handling**: Graceful fallbacks for missing dependencies
- **Logging**: Structured logging with typed interfaces
- **Patterns**: Factory functions for creating provider-specific implementations
- **Testing**: Unit tests for each utility function and tokenizer

## Architecture
- Logging system with hierarchical loggers and structured metadata
- Provider-agnostic token counting with model-specific implementations
- Model information registry with pricing, context windows, and capabilities
- Shared type definitions for cross-package consistency
- Lazy-loading of heavy dependencies (tokenizers) to optimize startup time