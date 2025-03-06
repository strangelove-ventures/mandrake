# Mandrake MCP (Model Context Protocol) Development Guide

## Commands
- Build package: `bun run build`
- Run all tests: `bun test`
- Run specific test: `bun test tests/integration.test.ts`
- Filter tests: `bun test --test-name-pattern "invokes tools"`
- Run focused tests: `bun test --only` (with test.only() in test file)
- Lint: `bun run lint`
- Clean build: `bun run clean`

## Project Structure
- `src/manager.ts`: Top-level MCPManager for multiple servers
- `src/server.ts`: MCPServerImpl for individual server management
- `src/transport/`: Communication mechanisms (stdio, SSE)
- `src/types/`: TypeScript interfaces and shared types
- `tests/`: Integration tests with mock servers

## Code Style
- **Imports**: External dependencies first, then internal modules
- **Error Handling**: Use specific error messages, propagate context
- **State Management**: Use immutable patterns for server state
- **Async**: Use async/await for transport and server operations
- **Logging**: Use structured logging with specific component metadata
- **Testing**: Write integration tests with mock/stub MCP servers

## Architecture
- MCPManager manages multiple MCP servers through a unified interface
- MCPServerImpl handles individual server lifecycle and tool invocation
- Transports abstract communication mechanisms (stdio, SSE)
- Server config follows MCP specification format with command, args, env