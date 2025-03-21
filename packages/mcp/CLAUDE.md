# Mandrake MCP (Model Context Protocol) Development Guide

## Commands
- Build package: `bun run build`
- Run all tests: `bun test`
- Run specific test: `bun test tests/integration.test.ts`
- Filter tests: `bun test --test-name-pattern "invokes tools"`
- Run focused tests: `bun test --only` (with test.only() in test file)
- Run tests with environment inheritance: `INHERIT_ENV=true bun test`
- Lint: `bun run lint`
- Clean build: `bun run clean`

## Project Structure
- `src/manager.ts`: Top-level MCPManager for multiple servers
- `src/server.ts`: MCPServerImpl for individual server management
- `src/config/`: Configuration validation and management
- `src/errors.ts`: Error types and handling utilities
- `src/transport/`: Communication mechanisms (stdio, SSE)
- `src/types/`: TypeScript interfaces and shared types
- `tests/`: Integration tests with mock servers

## Configuration System
- Use `ConfigManager` for validating, creating, and updating server configurations
- Standard properties: command, args, env, autoApprove, disabled, healthCheck
- Create minimal configuration:
  ```typescript
  const config = ConfigManager.create({
    command: 'node',
    args: ['server.js']
  })
  ```
- Update existing configuration:
  ```typescript
  const updated = ConfigManager.update(existingConfig, {
    healthCheck: { intervalMs: 15000 }
  })
  ```

## Code Style
- **Imports**: External dependencies first, then internal modules
- **Error Handling**: Use specific error messages, propagate context
- **State Management**: Use immutable patterns for server state
- **Async**: Use async/await for transport and server operations
- **Logging**: Use structured logging with specific component metadata
- **Testing**: Write integration tests with mock/stub MCP servers
- **Documentation**: Use JSDoc comments for all public methods and types

## Architecture
- MCPManager manages multiple MCP servers through a unified interface
- MCPServerImpl handles individual server lifecycle and tool invocation
- ConfigManager validates and creates standard server configurations
- Transports abstract communication mechanisms (stdio, SSE)
- Server config follows MCP specification format with command, args, env
- Health checks run periodically to ensure servers are functioning correctly