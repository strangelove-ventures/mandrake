# MCP (Model Context Protocol) Package

The MCP package manages Model Context Protocol servers for the Mandrake platform. It provides robust server lifecycle management, tool calling capabilities, and standardized error handling.

## Overview

The package manages server processes that implement the [Model Context Protocol](https://github.com/modelcontextprotocol/protocol), providing a standardized way to:

- Start, stop, and manage server processes
- Execute tool calls across multiple servers
- Handle server errors and logging
- Enable tool discovery and management

## Installation

```bash
bun install
```

## Usage

Basic usage example:

```typescript
import { MCPManager } from './src/manager'
import type { ServerConfig } from './src/types'

// Create manager instance
const manager = new MCPManager()

// Configure a filesystem server
const config: ServerConfig = {
  command: 'docker',
  args: [
    'run', '--rm', '-i',
    '--mount', 'type=bind,src=/path/to/dir,dst=/projects',
    'mcp/filesystem',
    '/projects'
  ]
}

// Start server
await manager.startServer('filesystem', config)

// List available tools
const tools = await manager.listAllTools()

// Call a tool
const result = await manager.invokeTool('filesystem', 'read_file', {
  path: '/projects/myfile.txt'
})

// Clean up
await manager.cleanup()
```

## Core Components

### MCPManager

Top-level manager that handles multiple MCP servers:

- Server lifecycle management (start/stop/cleanup)
- Tool discovery and invocation
- Status tracking

```typescript
const manager = new MCPManager()
await manager.startServer('server-id', config)
const tools = await manager.listAllTools()
await manager.cleanup()
```

### MCPServer

Individual server implementation that manages:

- Server process lifecycle
- Tool calls
- Error handling
- State management
- Log buffering

```typescript
const server = new MCPServerImpl('server-id', config)
await server.start()
const tools = await server.listTools()
await server.stop()
```

### TransportFactory

Creates appropriate transport based on configuration:

- StdioClientTransport for process-based servers
- SSEClientTransport for HTTP-based servers (planned)

## Server Support

The package currently supports:

1. Filesystem Server
   - File operations (read/write)
   - Directory management
   - File search capabilities

2. Fetch Server
   - Web content retrieval
   - Markdown conversion
   - Pagination support

## Testing

The package includes comprehensive testing using Bun's test runner.

### Test Server

A test server implementation is provided in `tests/server/` for development and testing. It implements basic MCP functionality with three tools:

1. add - Adds two numbers
2. echo - Returns input
3. error - Generates test error

This server is used extensively in the test suite to verify MCP behavior without external dependencies.

### Test Structure

Tests are organized into two main categories:

1. Integration Tests (`integration.test.ts`)
   - Basic server lifecycle
   - Tool discovery and calling
   - Multi-server operations

2. Server Tests (`servers.test.ts`)
   - Specific server implementations
   - Error handling
   - Server state management
   - Log capturing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/integration.test.ts
```

## Error Handling

The package implements robust error handling:

1. Server Errors
   - Process startup failures
   - Tool execution errors
   - Transport errors

2. Log Management
   - Error logs are captured in a buffer
   - Standard output is passed through
   - Log rotation for buffer management

## Configuration

Server configuration follows the Model Context Protocol specification:

```typescript
interface ServerConfig {
  command: string             // Server executable
  args?: string[]            // Command arguments
  env?: Record<string, string> // Environment variables
  disabled?: boolean         // Server state
}
```

## Development

For development:

1. Install dependencies:

```bash
bun install
```

1. Build test server:

```bash
cd tests/server
bun install
bun build
```

1. Run tests:

```bash
bun test
```
