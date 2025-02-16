# MCP Package Implementation Plan

## Overview

The MCP package provides Docker-based management of Model Context Protocol (MCP) servers. It handles container lifecycle, communication via JSONRPC 2.0, and provides a clean interface for tool execution.

## Core Components

### DockerMCPService

The main service class that manages multiple MCP servers. Acts as the primary interface for the application.

```typescript
interface DockerMCPService {
  // Start all configured servers
  startAll(servers: ServerConfig[]): Promise<void>;
  
  // Start a single server
  start(server: ServerConfig): Promise<void>;
  
  // Get logs for debugging
  logs(serverId: string): Promise<string>;
  
  // Restart server (stop, cleanup, start)
  restart(serverId: string): Promise<void>;
  
  // Get status of all servers
  statusAll(): Promise<Record<string, ServerStatus>>;
  
  // Get status of single server
  status(serverId: string): Promise<ServerStatus>;
  
  // Call tool on server
  callTool(serverId: string, toolName: string, params: any): Promise<ToolResult>;
  
  // List tools for a server
  listTools(serverId: string): Promise<Tool[]>;
  
  // List all tools across all servers
  listAllTools(): Promise<Record<string, Tool[]>>;

  // Stop and cleanup all servers
  cleanup(): Promise<void>;

  // Stop and cleanup a specific server
  cleanupServer(serverId: string): Promise<void>;

  // Force cleanup stale containers for this workspace
  cleanupStaleContainers(workspaceId: string): Promise<void>;
}
```

### DockerMCPServer

Represents an individual MCP server container.

```typescript
interface DockerMCPServer {
  getId(): string;
  getName(): string;
  getStatus(): ServerStatus;
  isReady(): boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  getLogs(tail?: number): Promise<string>;
  getInfo(): Promise<ContainerInfo>;
  listTools(): Promise<Tool[]>;
  invokeTool(name: string, params: any): Promise<ToolResult>;
}
```

### Transport Layer

The transport layer implements the MCP communication protocols. It's designed to support multiple transport mechanisms as specified in the MCP documentation.

```typescript
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

// Base transport interface extending MCP SDK Transport
interface MCPTransport extends Transport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
  reconnect(): Promise<void>;
}

// Stdio implementation using docker exec
class StdioMCPTransport implements Transport {
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
  reconnect(): Promise<void>;
}

// Placeholder for future SSE implementation
class SSEMCPTransport implements Transport {
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
  reconnect(): Promise<void>;
}
```

The TransportFactory will attempt to establish communication in this order:

1. Try Stdio transport (current implementation)
2. Try SSE transport (future implementation)

## Container Management

### Container Naming/Tagging Strategy

```typescript
interface ContainerIdentifier {
  workspaceId: string;    // Workspace ID
  serverId: string;       // Server ID from config
  timestamp: string;      // Compact timestamp (e.g. YYYYMMDDHHMMSS)
}

// Example container name format:
// mandrake-{workspaceId}-{serverId}-{timestamp}
// e.g. mandrake-workspace1-git-20250214153022
```

### Container Lifecycle Events

1. Creation
   - Generate unique container name using strategy above
   - Apply labels for tracking
   - Configure with workspace volume mounts if needed

2. Startup
   - Health check with retry policy
   - Establish transport via factory
   - Initialize MCP client
   - Mark as ready only after successful tool listing

3. Cleanup
   - Graceful shutdown of transport
   - Force kill if needed after timeout
   - Remove container with retries
   - Clear all resources

## File Structure

```shell
packages/mcp/
├── src/
│   ├── index.ts                 # Main exports
│   ├── docker/
│   │   ├── service.ts           # DockerMCPService implementation
│   │   ├── server.ts            # DockerMCPServer implementation
│   │   └── utils.ts             # Docker helper functions
│   ├── transport/
│   │   ├── index.ts             # Transport exports
│   │   ├── factory.ts           # Transport factory implementation
│   │   ├── base.ts              # Base transport interface
│   │   ├── stdio.ts             # Stdio transport implementation
│   │   └── sse.ts              # SSE transport stub
│   └── types/
│       └── index.ts             # Type definitions
├── tests/
│   ├── docker/
│   │   ├── service.test.ts      # Service tests
│   │   ├── server.test.ts       # Server tests
│   │   └── utils.test.ts        # Utils tests
│   ├── transport/
│   │   ├── factory.test.ts      # Transport factory tests
│   │   ├── stdio.test.ts        # Stdio transport tests
│   │   └── sse.test.ts         # SSE transport tests (stub)
│   └── integration/
│       └── lifecycle.test.ts    # Full lifecycle tests
└── package.json
```

## Testing Strategy

### Unit Tests

1. Service Tests
   - Server management (start/stop/restart)
   - Tool listing and execution
   - Error handling and recovery

2. Server Tests
   - Container lifecycle
   - Status management
   - Tool operations

3. Transport Tests
   - Transport factory behavior
   - JSONRPC message handling per transport type
   - Stream management
   - Error conditions
   - Transport fallback behavior

### Integration Tests

1. Lifecycle Tests
   - Measure startup time (target <1s)
   - Measure shutdown time (target <5s)
   - Test multiple concurrent servers
   - Verify cleanup under various conditions

2. Tool Execution Tests
   - Basic tool functionality (filesystem, git, fetch)
   - Error handling and recovery
   - Performance under load

3. Transport Tests
   - Verify transport selection logic
   - Test transport reconnection scenarios
   - Measure transport performance characteristics

### Performance Targets

- Container startup: <1s
- Container shutdown: <5s
- Tool execution: Response within 100ms
- Transport initialization: <500ms
- Stable under concurrent operations

## Logging Strategy

Utilize the utils/logger package with:

1. DEBUG level
   - Container lifecycle events
   - Transport details and selection
   - Tool execution details

2. INFO level
   - Server status changes
   - Transport changes
   - Basic operation flow

3. ERROR level
   - Container failures
   - Transport errors
   - Tool execution failures

## Implementation Priorities

1. Core Container Management
   - Basic DockerMCPServer with reliable lifecycle
   - Improved container naming/cleanup

2. Transport Layer
   - Transport factory implementation
   - Robust Stdio transport implementation
   - SSE transport scaffolding
   - Better error handling and recovery

3. Service Layer
   - Multi-server management
   - Tool execution and listing

4. Testing Infrastructure
   - Performance measurement
   - Lifecycle testing
   - Transport testing
   - Tool execution testing