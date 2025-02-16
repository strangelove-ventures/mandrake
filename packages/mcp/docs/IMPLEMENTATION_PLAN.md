# MCP Package Implementation Plan

This document outlines the implementation plan for the Model Context Protocol (MCP) package in Mandrake.

## Overview

The MCP package provides server management for Model Context Protocol servers. It handles:

- Server lifecycle (start/stop/restart)
- Transport management (stdio/sse)
- Tool calling
- Error handling and status tracking
- Log buffering and state management

## Types

We'll use the same types as Cline for configuration compatibility:

```typescript
interface MCPConnection {
  server: {
    name: string
    status: 'connected' | 'disconnected' | 'connecting'
    error?: string
    tools?: MCPTool[]
    disabled?: boolean
  }
  client: Client  // from MCP SDK
  transport: StdioClientTransport | SSETransport
}

interface ServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  autoApprove?: string[]
  disabled?: boolean
}

interface ServerState {
  error?: string
  lastRetryTimestamp?: number
  retryCount: number
  logs: string[]  // Rolling buffer of recent logs
}
```

## Package Structure

```sh
packages/mcp/
├── src/
│   ├── transport/
│   │   ├── factory.ts      # Creates appropriate transport
│   │   ├── stdio.ts        # StdioTransport implementation 
│   │   └── sse.ts          # SSE Transport implementation
│   ├── server.ts           # Individual server management
│   ├── manager.ts          # Overall MCP management
│   ├── logger.ts           # Log buffer implementation
│   └── types.ts            # Shared types
└── tests/                  # Integration tests with standard servers
    └── servers/            
        ├── filesystem/     
        ├── git/            
        └── fetch/          
```

## Key Components

### Log Buffer

Manages server logs with size limits:

```typescript
class LogBuffer {
  private logs: string[] = [];
  private static MAX_LOGS = 100;
  private static MAX_LOG_LENGTH = 1000;

  append(log: string) {
    // Truncate long logs
    const truncated = log.length > LogBuffer.MAX_LOG_LENGTH 
      ? log.slice(0, LogBuffer.MAX_LOG_LENGTH) + "..."
      : log;

    this.logs.push(truncated);
    
    // Remove old logs if buffer full
    if (this.logs.length > LogBuffer.MAX_LOGS) {
      this.logs.shift();
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }
}
```

### Server Manager

Manages individual server lifecycle:

```typescript
class MCPServer {
  private client: Client;
  private transport: Transport;
  private logBuffer: LogBuffer;
  private state: ServerState;
  
  constructor(private config: ServerConfig) {
    this.logBuffer = new LogBuffer();
    this.state = {
      retryCount: 0,
      logs: []
    };
  }

  async start() {
    try {
      this.transport = TransportFactory.create(this.config);
      
      if (this.transport instanceof StdioClientTransport) {
        this.handleStderr(this.transport.stderr);
      }
      
      await this.client.connect(this.transport);
      this.state.retryCount = 0;
      
    } catch (error) {
      await this.handleStartError(error);
    }
  }

  private async handleStartError(error: any) {
    this.state.error = error.message;
    this.state.lastRetryTimestamp = Date.now();
    
    if (this.state.retryCount < 3) {
      const delay = Math.pow(2, this.state.retryCount);
      this.state.retryCount++;
      
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
      await this.start();
    }
  }

  async stop() {
    try {
      await this.transport.close();
      
      // Force kill after timeout
      const forceKillTimeout = setTimeout(() => {
        if (this.transport instanceof StdioClientTransport) {
          this.transport.process.kill('SIGKILL');
        }
      }, 3000);
      
      await this.client.close();
      clearTimeout(forceKillTimeout);
      
    } catch (error) {
      this.state.error = `Error stopping server: ${error.message}`;
    }
  }

  async callTool(tool: string, args: any) {
    if (this.config.disabled) {
      throw new Error('Server is disabled');
    }
    return this.client.request({
      method: "tools/call",
      params: {
        name: tool,
        arguments: args
      }
    });
  }

  async listTools() {
    if (this.config.disabled) {
      return [];
    }
    const response = await this.client.request({
      method: "tools/list"
    });
    return response.tools || [];
  }

  getState(): ServerState {
    return {
      ...this.state,
      logs: this.logBuffer.getLogs()
    };
  }

  private handleStderr(stream: NodeJS.ReadableStream) {
    stream.on('data', (data: Buffer) => {
      const output = data.toString();
      this.logBuffer.append(output);
      
      if (output.toLowerCase().includes('error')) {
        this.state.error = output;
      }
    });
  }
}
```

### MCP Manager

Top-level manager for all MCP servers:

```typescript
class MCPManager {
  private servers: Map<string, MCPServer>;
  
  constructor() {
    this.servers = new Map();
  }

  async startServer(config: ServerConfig) {
    const server = new MCPServer(config);
    await server.start();
    this.servers.set(config.name, server);
  }

  async stopServer(name: string) {
    const server = this.servers.get(name);
    if (!server) return;
    
    await server.stop();
    this.servers.delete(name);
  }

  async updateServer(name: string, config: ServerConfig) {
    await this.stopServer(name);
    await this.startServer(config);
  }

  async listAllTools() {
    const allTools = [];
    for (const [name, server] of this.servers) {
      if (!server.config.disabled) {
        const tools = await server.listTools();
        allTools.push(...tools.map(tool => ({
          ...tool,
          server: name
        })));
      }
    }
    return allTools;
  }

  getServerState(name: string): ServerState | undefined {
    return this.servers.get(name)?.getState();
  }

  async cleanup() {
    const stopPromises = Array.from(this.servers.values())
      .map(server => server.stop());
    await Promise.all(stopPromises);
    this.servers.clear();
  }
}
```

## Testing Plan

1. Server Lifecycle
   - Test server start/stop/restart
   - Verify force kill after timeout
   - Test disabled server behavior
   - Verify retry/backoff strategy

2. Log Management
   - Test log buffer limits
   - Verify log truncation
   - Test error extraction from logs

3. Tool Management
   - Test tool listing with disabled servers
   - Verify tool calls fail on disabled servers
   - Test concurrent tool calls

4. Error Handling
   - Test retry behavior
   - Verify error state persistence
   - Test error propagation

## Implementation Steps

1. Core Infrastructure (Week 1)
   - Implement LogBuffer
   - Setup basic server management
   - Add transport factory

2. Server Management (Week 1-2)
   - Implement MCPServer
   - Add retry logic
   - Add state management
   - Setup process cleanup

3. Manager Layer (Week 2)
   - Implement MCPManager
   - Add tool management
   - Add server updates
   - Setup cleanup

4. Testing & Integration (Week 3)
   - Add standard servers
   - Write integration tests
   - Add documentation
   - Performance testing

## Usage Example

```typescript
const manager = new MCPManager();

// Start a server
await manager.startServer({
  name: 'filesystem',
  command: 'mcp-fs',
  args: ['--workspace', '/path/to/workspace']
});

// Get server state
const state = manager.getServerState('filesystem');
console.log('Server logs:', state.logs);

// List available tools
const tools = await manager.listAllTools();

// Call tool
const result = await manager.callTool('filesystem', 'readFile', {
  path: '/some/file.txt'
});

// Cleanup
await manager.cleanup();
```

## Workspace Package Changes

We need to update the tools configuration in workspace to match Cline's config format:

### Type Change

```typescript
// packages/workspace/src/types/workspace/tools.ts

import { z } from 'zod';

// Replace existing serverConfigSchema with Cline-compatible version
export const serverConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  autoApprove: z.array(z.string()).optional(),
  disabled: z.boolean().optional()
});

export const toolsConfigSchema = z.record(serverConfigSchema);

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type ToolsConfig = z.infer<typeof toolsConfigSchema>;
```

### ToolsManager Updates

The main change is that tools are now stored as a record keyed by name rather than an array:

```typescript
// packages/workspace/src/managers/tools.ts

export class ToolsManager extends BaseConfigManager<ToolsConfig> {
  constructor(path: string) {
    super(path, toolsConfigSchema, { 
      type: 'tools'
    });
  }

  async list(): Promise<[string, ServerConfig][]> {
    const config = await this.read();
    return Object.entries(config);
  }

  async get(name: string): Promise<ServerConfig | undefined> {
    const config = await this.read();
    return config[name];
  }

  async add(name: string, config: ServerConfig): Promise<void> {
    const tools = await this.read();
    if (tools[name]) {
      throw new Error(`Tool with name ${name} already exists`);
    }
    tools[name] = config;
    await this.write(tools);
  }

  async update(name: string, updates: Partial<ServerConfig>): Promise<void> {
    const tools = await this.read();
    if (!tools[name]) {
      throw new Error(`Tool ${name} not found`);
    }
    tools[name] = { ...tools[name], ...updates };
    await this.write(tools);
  }

  async remove(name: string): Promise<void> {
    const tools = await this.read();
    if (!tools[name]) {
      throw new Error(`Tool ${name} not found`);
    }
    delete tools[name];
    await this.write(tools);
  }

  protected getDefaults(): ToolsConfig {
    return {};
  }
}
```

This keeps us compatible with Cline's config format while maintaining our existing workspace management patterns. The config files will look like:

```json
{
  "filesystem": {
    "command": "mcp-fs",
    "args": ["--workspace", "/path/to/workspace"],
    "autoApprove": ["readFile", "writeFile"]
  },
  "git": {
    "command": "mcp-git",
    "env": {
      "GIT_AUTHOR_NAME": "Mandrake"
    }
  }
}
```
