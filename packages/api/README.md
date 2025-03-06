# Mandrake API

This package serves as the API layer for the Mandrake project, providing RESTful endpoints for all core functionality. It's built with Hono and designed to be integrated with a Next.js frontend.

## Status

The API currently has passing tests for all routes, with a mix of test implementations and actual manager implementations. The routes are structured to follow a consistent pattern for system-level and workspace-level operations.

## Features

- System-level operations via `/system/*` routes
- Workspace-level operations via `/workspaces/:id/*` routes
- Configuration management
- Tool configuration and operation
- Model provider management
- Prompt configuration
- Files management
- Dynamic context management
- Session management with streaming support

## Implementation Status

- ✅ Project structure and dependencies setup
- ✅ Manager initialization and access system
- ✅ Basic API routes with test implementations
- ✅ All tests passing
- ✅ Proper integration with manager objects
- ✅ Route parameter validation
- ✅ Proper error handling
- 🔄 Streaming session responses
- ⏳ Integration with Next.js frontend

## Running Tests

```bash
bun test
```

## Development

```bash
bun dev
```

## Routes Summary

### System-Level Routes (/system)
- **GET /system** - System info
- **GET|PUT /system/config** - Mandrake configuration management
- **GET|POST|PUT|DELETE /system/tools** - Tools configuration
- **GET|POST /system/mcp** - MCP server/tool operations
- **GET|POST|PUT|DELETE /system/models** - Models management
- **GET|PUT /system/prompt** - Prompt configuration
- **GET|POST|PUT|DELETE /system/dynamic** - Dynamic context management
- **GET|POST|PUT|DELETE /system/sessions** - Session management with streaming

### Workspace-Level Routes (/workspaces)
- **GET /workspaces/list** - List all workspaces
- **POST /workspaces/create** - Create a new workspace
- **GET|DELETE /workspaces/:id** - Workspace info/management 
- **GET|PUT /workspaces/:id/config** - Workspace configuration
- **GET|POST|PUT|DELETE /workspaces/:id/tools** - Tools configuration
- **GET|POST /workspaces/:id/mcp** - MCP server/tool operations
- **GET|POST|PUT|DELETE /workspaces/:id/models** - Models management
- **GET|PUT /workspaces/:id/prompt** - Prompt configuration
- **GET|POST|PUT|DELETE /workspaces/:id/files** - Files management
- **GET|POST|PUT|DELETE /workspaces/:id/dynamic** - Dynamic context management
- **GET|POST|PUT|DELETE /workspaces/:id/sessions** - Session management with streaming

## Next Steps

1. Update workspace route implementations to use real manager methods
2. Ensure streaming responses work correctly
3. Add more unit tests for individual routes
4. Add integration tests for full workflows
5. Add authentication and authorization
6. Add API documentation
7. Integrate with the Next.js frontend

## Architecture

The API uses a layered approach:
- **index.ts** - Main entry point and server setup
- **managers.ts** - Manager initialization and access
- **routes/** - Route modules for different functionality
- **types.ts** - TypeScript interfaces

Routes are designed for code reuse between system and workspace levels where possible. Middleware is used to pass managers to routes via context or request forwarding.