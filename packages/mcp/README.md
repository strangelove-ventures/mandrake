# MCP (Model Context Protocol)

## Overview

The MCP package provides management for Model Context Protocol servers in Mandrake. It handles server lifecycle, communication transport, tool discovery and invocation, error handling, and log management. This package enables Mandrake to connect with external tools like filesystem access, git operations, and web requests through a standardized protocol.

## Core Concepts

### MCP Servers

MCP servers are external processes that expose tools via the Model Context Protocol. Each server:

- Has a unique identifier
- Can be started, stopped, and restarted
- Exposes a set of tools
- Maintains state and logs

### Tools

Tools are capabilities exposed by MCP servers that can be invoked by Mandrake. Each tool:

- Has a name, description, and parameters
- Can be called with arguments
- Returns structured results
- May be auto-approved for certain operations

### Transports

The MCP package supports multiple transport mechanisms:

- **Stdio Transport**: Communication via standard input/output with spawned processes
- **SSE Transport**: Communication via Server-Sent Events over HTTP

### Server Configuration

Servers are configured with:

```typescript
interface ServerConfig {
  command: string;              // Command to execute
  args?: string[];              // Command arguments
  env?: Record<string, string>; // Environment variables
  autoApprove?: string[];       // Methods to auto-approve
  disabled?: boolean;           // Whether server is disabled
}
```

## Architecture

The MCP package consists of these key components:

### MCPServerImpl

Manages an individual MCP server instance:

- Handles server lifecycle (start/stop)
- Establishes and maintains transport
- Provides tool discovery and invocation
- Manages error handling and retry logic
- Buffers server logs

### MCPManager

Provides top-level management of multiple MCP servers:

- Creates and manages server instances
- Provides access to tools across all servers
- Enables tool invocation by server name
- Handles cleanup and resource management

### Transport Layer

Abstracts the communication mechanism:

- **TransportFactory**: Creates appropriate transport based on configuration
- **StdioClientTransport**: Communicates via stdin/stdout with child processes
- **SSEClientTransport**: Communicates via HTTP Server-Sent Events

### LogBuffer

Manages server logs with size limits:

- Maintains a rolling buffer of recent logs
- Truncates long log entries
- Provides access to current log state

## Usage

### Basic Server Management

```typescript
import { MCPManager } from '@mandrake/mcp';

// Create manager
const manager = new MCPManager();

// Start a server
await manager.startServer('filesystem', {
  command: '/path/to/mcp-fs',
  args: ['--workspace', '/path/to/workspace']
});

// Get server state
const state = manager.getServerState('filesystem');
console.log('Server logs:', state.logs);

// Stop a server
await manager.stopServer('filesystem');

// Cleanup all servers
await manager.cleanup();
```

### Tool Discovery and Invocation

```typescript
import { MCPManager } from '@mandrake/mcp';

const manager = new MCPManager();

// Start servers
await manager.startServer('filesystem', { command: '/path/to/mcp-fs' });
await manager.startServer('git', { command: '/path/to/mcp-git' });

// List all available tools across servers
const allTools = await manager.listAllTools();
console.log('Available tools:', allTools.map(t => `${t.server}/${t.name}`));

// Invoke a tool on a specific server
const result = await manager.invokeTool('filesystem', 'readFile', { 
  path: '/some/file.txt' 
});

// Handle tool result
console.log('File contents:', result.content[0].text);
```

### Low-level Server API

```typescript
import { MCPServerImpl } from '@mandrake/mcp';

// Create a server instance
const server = new MCPServerImpl('filesystem', {
  command: '/path/to/mcp-fs',
  args: ['--workspace', '/path/to/workspace']
});

// Start the server
await server.start();

// Get available tools
const tools = await server.listTools();
console.log('Tools:', tools);

// Call a tool
const result = await server.invokeTool('readFile', {
  path: '/some/file.txt'
});

// Get server logs
const state = server.getState();
console.log('Recent logs:', state.logs);

// Stop the server
await server.stop();
```

## Key Interfaces

### MCPConnection

```typescript
interface MCPConnection {
  server: {
    name: string;
    status: 'connected' | 'disconnected' | 'connecting';
    error?: string;
    tools?: Tool[];
    disabled?: boolean;
  };
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
}
```

### ServerConfig

```typescript
interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  autoApprove?: string[];
  disabled?: boolean;
}
```

### ServerState

```typescript
interface ServerState {
  error?: string;
  lastRetryTimestamp?: number;
  retryCount: number;
  logs: string[];
}
```

### ToolWithServer

```typescript
interface ToolWithServer extends Tool {
  serverName: string;
}
```

## Integration Points

The MCP package integrates with several other components in Mandrake:

### Workspace Package

- Uses tool configurations defined in the workspace
- Provides tools for dynamic context execution
- Accesses workspace files for tool operations

### Session Package

- Enables tool execution from LLM sessions
- Provides tool capabilities to the provider

### Provider Package

- Uses MCP tools to enhance LLM capabilities
- Translates between LLM tool calls and MCP tool invocations

## Future Improvements

- **Docker Integration**: Transition to Docker-based MCP server management
- **Enhanced Transport**: Add more transport options for better performance
- **Tool Authorization**: Implement more granular tool permission controls
- **Improved Resilience**: Better error recovery and reconnection strategies
