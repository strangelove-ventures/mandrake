# Mandrake Session Package Development Guide

## Commands
- Build package: `bun run build`
- Run all tests: `NODE_ENV=test bun test`
- Run specific test: `NODE_ENV=test bun test tests/integration/session.test.ts`
- Filter tests: `NODE_ENV=test bun test --test-name-pattern "handles multistage tool flow"`
- Run focused tests: `NODE_ENV=test bun test --only` (with test.only() in test file)
- Clean build: `bun run clean`

## Project Structure
- `src/coordinator.ts`: Main SessionCoordinator class orchestrating conversations
- `src/prompt/`: System prompt building and section components
- `src/utils/`: Helper functions for messages, provider setup, and context trimming
- `src/errors.ts`: Specialized error classes for different failure modes
- `tests/integration/`: End-to-end tests with mock MCP servers

## Code Style
- **Imports**: External dependencies first, then internal modules
- **Error Handling**: Use specialized error classes with proper cause chaining
- **Logging**: Structured logging with component-specific fields
- **Async**: Use async/await for all external interactions
- **Interfaces**: Clear separation between coordinator and component interfaces
- **Testing**: Integration tests with realistic tool flows and session storage

## Architecture
- SessionCoordinator connects workspace, MCP, and provider packages
- Tool calls are detected using XML pattern matching in model responses
- Context building assembles system prompt, file content, and dynamic context
- SystemPromptBuilder uses modular section builders for different prompt parts
- Message history is managed with token-aware trimming strategies