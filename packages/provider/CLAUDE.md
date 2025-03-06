# Mandrake Provider Package Development Guide

## Commands
- Build package: `bun run build`
- Run all tests: `bun test`
- Run specific test: `bun test tests/unit/base.test.ts`
- Run by pattern: `bun test --test-name-pattern "calculates cost"`
- Run focused tests: `bun test --only` (with test.only() in test file)
- Clean build: `bun run clean`

## Project Structure
- `src/base.ts`: Abstract BaseProvider with common functionality
- `src/providers/`: Specific LLM provider implementations
- `src/errors.ts`: Specialized error classes for provider failures
- `src/factory.ts`: Factory function for creating provider instances
- `src/types.ts`: Core interfaces for messages and streaming

## Code Style
- **Imports**: External dependencies first, then internal modules
- **Errors**: Specialized error classes with cause chaining
- **Logging**: Structured logging with provider and model info
- **Streams**: Use async generators for message streaming
- **Types**: Discriminated unions for stream chunks (TextChunk, UsageChunk)
- **Testing**: Unit tests for base functionality, integration tests with real APIs

## Architecture
- BaseProvider defines common interface for all LLM providers
- Provider-specific implementations handle API interaction details
- Factory pattern creates correct provider based on configuration
- Message stream uses async generators for efficient streaming
- Token counting and cost calculation is standardized across providers