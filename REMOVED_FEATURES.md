# Removed Features - Mandrake CLI Transformation

This document details the features and components removed during the transformation of Mandrake from a web-based AI agent platform to a CLI-first tool.

## Date of Removal
May 22, 2025

## Components Removed

### 1. Web Application (`/web`)
The entire Next.js-based web frontend was removed, including:
- React components for UI
- State management with Zustand
- API client implementation
- Real-time streaming interface
- Session chat interface
- Workspace management UI
- Configuration panels
- Model and provider management UI

### 2. API Server (`/packages/api`)
The Hono-based API server was removed, including:
- RESTful endpoints for all resources
- WebSocket streaming implementation
- OpenAPI documentation
- Service registry for component coordination
- API tests and integration tests

### 3. API System Prompt (`SYSTEM_PROMPT_API.md`)
The API-specific system prompt was removed as it's no longer relevant for CLI usage.

## Key Learnings from Web/API Implementation

### 1. Streaming Architecture
- The WebSocket-based streaming worked well for real-time LLM responses
- Handling reconnections and state synchronization was complex
- Consider simpler streaming approach for CLI (direct stdout)

### 2. State Management
- Zustand provided good reactivity for UI updates
- The separation between UI state and core business logic was beneficial
- Keep this separation in CLI implementation

### 3. Configuration Management
- Having separate system vs workspace configurations was useful
- The ability to override configurations at different levels added flexibility
- Preserve this hierarchy in CLI configuration

### 4. Session Management
- The session coordinator pattern worked well for managing multiple LLM sessions
- Tool execution coordination was complex but necessary
- These patterns should be preserved in the CLI implementation

### 5. Tool Integration
- MCP servers provided good isolation but added complexity
- Native TypeScript tools would be simpler for CLI use
- Consider hybrid approach: native tools with MCP compatibility

## Migration Path

Users of the web interface should transition to the CLI tool, which will provide:
- Terminal-based interface with rich formatting
- Direct file system access without API overhead
- Git integration for version control
- Enhanced security for sensitive operations
- Better performance without network layer

## Preserved Components

The following packages were kept and will form the foundation of the CLI tool:
- `/packages/workspace` - Workspace management
- `/packages/session` - LLM session handling
- `/packages/mcp` - MCP server integration
- `/packages/provider` - LLM provider abstraction
- `/packages/utils` - Shared utilities
- `/packages/ripper` - File system operations (to be replaced with native tools)

## Future Considerations

1. **API Resurrection**: If an API is needed in the future, consider:
   - GraphQL instead of REST for better query flexibility
   - gRPC for internal service communication
   - Separate API package that wraps CLI functionality

2. **Web Interface**: If a web interface is needed:
   - Consider a separate project that uses the CLI as a backend
   - Explore terminal-in-browser solutions
   - Keep it decoupled from core functionality

3. **Tool Execution**: 
   - The current MCP approach works but is heavyweight
   - Native TypeScript tools would be more efficient
   - Consider a plugin system for custom tools

## Commit Reference
This removal was done in commit [will be updated after commit] on branch `mandrake/cli-transformation/20250522-110133-cleanup`.
