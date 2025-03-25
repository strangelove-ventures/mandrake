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

#### Environment Variable Handling

When using Stdio Transport, the MCP package ensures critical environment variables (such as PATH) are properly passed to child processes. This is particularly important for Docker-based tools that need access to system binaries.

The TransportFactory automatically includes important environment variables like:

- PATH: Required for finding executables like Docker
- DOCKER_HOST, DOCKER_CONFIG, DOCKER_CERT_PATH: For Docker configuration
- HOME, USER, TERM, SHELL: Common system variables

This implementation eliminates the need for global environment flags like INHERIT_ENV while maintaining security by only passing necessary variables.

### Server Configuration

Servers are configured with validated configurations using the ConfigManager:

```typescript
import { ConfigManager } from '@mandrake/mcp/config';

// Create minimal validated configuration
const config = ConfigManager.create({
  command: 'node',
  args: ['server.js'],
  env: { NODE_ENV: 'production' },
  autoApprove: ['readFile'],
  healthCheck: {
    strategy: 'tool_listing',
    intervalMs: 30000
  }
});

// Update an existing configuration
const updatedConfig = ConfigManager.update(existingConfig, {
  disabled: false,
  healthCheck: { timeoutMs: 10000 }
});
```

Configuration includes:

```typescript
interface ServerConfig {
  command: string;                // Command to execute
  args?: string[];                // Command arguments
  env?: Record<string, string>;   // Environment variables
  autoApprove?: string[];         // Methods to auto-approve
  disabled?: boolean;             // Whether server is disabled
  healthCheck?: HealthCheckConfig; // Health check configuration
}

interface HealthCheckConfig {
  strategy: 'tool_listing' | 'ping' | 'specific_tool' | 'custom';
  intervalMs?: number;            // Check interval (default: 30000)
  timeoutMs?: number;             // Timeout for checks (default: 5000)
  retries?: number;               // Failed check retries (default: 1)
  specificTool?: {                // For specific_tool strategy
    name: string;                 // Tool to invoke
    args: Record<string, any>;    // Arguments to pass
  };
}
```

## Architecture

The MCP package follows a modular architecture with clear separation of concerns:

### MCPManager (`src/manager.ts`)

Provides top-level management of multiple MCP servers:

- Creates and manages server instances
- Provides access to tools across all servers
- Enables tool invocation by server name
- Performs health checks across all servers
- Handles cleanup and resource management

### Server Implementation (`src/server/`)

The server implementation uses a composition pattern for better separation of concerns:

#### MCPServerImpl (`src/server/impl.ts`)

Core server implementation that coordinates all components:

- Uses composition to delegate responsibilities to specialized components
- Orchestrates interactions between components
- Provides a unified interface to the MCPManager
- Handles error propagation and logging

#### ServerLifecycle (`src/server/lifecycle.ts`)

Manages server lifecycle and state:

- Handles server start/stop operations
- Manages retry logic with exponential backoff
- Tracks server state and status
- Maintains server logs using LogBuffer

#### ServerHealthManager (`src/server/health.ts`)

Dedicated health monitoring component:

- Implements configurable health check strategies
- Tracks health metrics and history
- Performs periodic health checks
- Provides detailed health reporting

#### TransportManager (`src/server/transport-manager.ts`)

Handles transport creation and management:

- Creates appropriate transport based on configuration
- Sets up error and log handling
- Manages transport connections and cleanup

#### ClientManager (`src/server/client-manager.ts`)

Manages MCP client operations:

- Creates and connects clients to transports
- Handles tool discovery and invocation
- Manages completions and parameter suggestions
- Provides structured error handling

#### ProxyManager (`src/server/proxy-manager.ts`)

Handles bidirectional proxies between transports:

- Sets up communication channels
- Manages message routing
- Handles connection errors

### Configuration System (`src/config/`)

Manages server configuration validation and creation:

#### ConfigManager (`src/config/manager.ts`)

- Validates configurations against schema with Zod
- Provides type-safe configuration objects with defaults
- Supports deep merging of configuration objects
- Enables configuration inheritance and updates

#### Schema Definitions (`src/config/schema.ts`)

- Defines Zod schemas for server and health check configurations
- Provides type inference for configuration objects
- Creates default configurations for common scenarios

## Usage

### Basic Server Management

```typescript
import { MCPManager } from '@mandrake/mcp';
import { ConfigManager } from '@mandrake/mcp/config';

// Create manager
const manager = new MCPManager();

// Create validated configuration
const config = ConfigManager.create({
  command: '/path/to/mcp-fs',
  args: ['--workspace', '/path/to/workspace'],
  healthCheck: {
    strategy: 'tool_listing',
    intervalMs: 15000
  }
});

// Start a server
await manager.startServer('filesystem', config);

// Get server state
const state = manager.getServerState('filesystem');
console.log('Server status:', state.status);
console.log('Server logs:', state.logs);
console.log('Health metrics:', state.health);

// Check health explicitly
await manager.checkServerHealth();

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
  status: 'uninitialized' | 'starting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  lastRetryTimestamp?: number;
  retryCount: number;
  logs: string[];
  health?: {
    isHealthy: boolean;
    lastCheckTime: number;
    responseTimeMs?: number;
    checkCount: number;
    failureCount: number;
    consecutiveFailures: number;
    lastError?: string;
    checkHistory: Array<{
      timestamp: number;
      success: boolean;
      responseTimeMs?: number;
      error?: string;
    }>;
  };
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
- Configures server health checks based on workspace settings

### Session Package

- Enables tool execution from LLM sessions
- Provides tool capabilities to the provider
- Uses the MCP health reporting for tool availability

### Provider Package

- Uses MCP tools to enhance LLM capabilities
- Translates between LLM tool calls and MCP tool invocations
- Handles tool completion requests

### API Package

- Exposes MCP server management via REST APIs
- Provides server health metrics to the frontend
- Enables server administration through API endpoints

## Development

### Directory Structure

```sh
src/
├── config/             # Configuration validation and management
│   ├── schema.ts       # Zod schemas for configurations
│   └── manager.ts      # Configuration management utilities
├── server/             # Server implementation components
│   ├── impl.ts         # Main server implementation
│   ├── lifecycle.ts    # Server lifecycle management
│   ├── health.ts       # Health check implementation
│   ├── client-manager.ts # MCP client management
│   └── transport-manager.ts # Transport creation and management
├── manager.ts          # Top-level MCP manager
├── errors.ts           # Error types and handling
└── types/              # TypeScript type definitions
    └── index.ts        # Core type definitions
```

## Future Improvements

- **Docker Integration**: Transition to Docker-based MCP server management
- **Enhanced Transport**: Add more transport options for better performance
- **Tool Authorization**: Implement more granular tool permission controls
- **Improved Resilience**: Better error recovery and reconnection strategies
- **Observability**: Enhanced metrics and monitoring for server health
- **Test Utilities**: Simplified testing support for MCP integrations
