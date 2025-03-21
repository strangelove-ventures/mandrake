# MCPManager Service Documentation

This document provides detailed documentation of the MCPManager service, focusing on its process management, MCP server lifecycle, and health monitoring capabilities.

## Service Overview

The MCPManager is responsible for:
- Managing the lifecycle of MCP server processes
- Providing a registry of available tool methods
- Handling tool invocation and responses
- Monitoring server health
- Supporting completions for tool arguments
- Providing detailed server status information

## Initialization Requirements

### Configuration Parameters

- There are no direct configuration parameters for MCPManager itself
- Configuration for individual servers comes from ToolsManager

### Instantiation Process

```typescript
// For system-level MCP manager
const systemMcpManager = new MCPManager();

// For workspace-level MCP manager
const mcpManager = new MCPManager();
```

### Server Creation Process

```typescript
// Get tool configurations from ToolsManager
const active = await toolsManager.getActive();
const toolConfigs = await toolsManager.getConfigSet(active);

// Start servers for each tool configuration
for (const [toolName, config] of Object.entries(toolConfigs)) {
  if (!config) continue;
  try {
    await mcpManager.startServer(toolName, config);
  } catch (serverError) {
    console.warn(`Failed to start server for tool ${toolName}:`, serverError);
  }
}
```

### State After Initialization

- MCPManager instance created with empty server map
- Health check interval started
- Ready to start individual servers

## Process Management

### MCP Server Processes

Each server started by MCPManager:
- Represents a child process running an MCP-compatible tool
- Has its own lifecycle (start, stop, restart)
- Has a unique ID for identification
- Maintains its own state and logs
- Can have its health monitored

### Server Startup Process

```typescript
async startServer(id: string, config: ServerConfig) {
  // Validate configuration
  const validatedConfig = ConfigManager.validate(config);
  
  // Create server instance
  const server = new MCPServerImpl(id, validatedConfig);
  
  // Start the server (spawns child process)
  await server.start();
  
  // Register in server map
  this.servers.set(id, server);
}
```

### Server Process Composition

Each MCPServerImpl instance uses composition with:
1. **ServerLifecycle**: Manages the server's lifecycle and state
2. **TransportManager**: Creates and manages transport mechanisms
3. **ClientManager**: Handles client connections and tool invocation
4. **ProxyManager**: Facilitates bidirectional communication

### Child Process Management

- Child processes are spawned as separate OS processes
- Standard I/O or SSE is used for communication
- Child process exit is monitored and can trigger retries
- Process output is captured in logs

## Persistence Considerations

### In-Memory State

MCPManager maintains these in-memory data structures:
- **servers**: Map of server ID to MCPServerImpl instance
- **healthCheckInterval**: NodeJS.Timer for periodic health checks

### Child Process Persistence

- Child processes persist independently of the Node.js process
- Proper cleanup is needed to prevent orphaned processes
- Health monitoring helps detect and recover from process failures

### No Disk Persistence

- MCPManager itself doesn't persist state to disk
- Tool configurations are managed by ToolsManager
- Server state is ephemeral and recreated on startup

## Cleanup Requirements

### Resources to Release

- **Child Processes**: Must be terminated gracefully
- **Health Check Interval**: Must be cleared to prevent memory leaks
- **Client Connections**: Must be closed properly

### Cleanup Process

```typescript
async cleanup() {
  // Stop health checks
  if (this.healthCheckInterval) {
    clearInterval(this.healthCheckInterval);
    this.healthCheckInterval = undefined;
  }
  
  // Stop all servers in parallel
  const stopPromises = Array.from(this.servers.values())
    .map(server => {
      return server.stop().catch(error => {
        this.logger.error('Error stopping server during cleanup', {
          id: server.getId(),
          error: error instanceof Error ? error.message : String(error)
        });
      });
    });

  await Promise.all(stopPromises);
  this.servers.clear();
}
```

### Graceful vs. Force Termination

- No explicit support for force termination
- All servers are stopped with standard stop method
- Errors during cleanup are logged but don't prevent other servers from being cleaned up

## Health Monitoring

### Health Check Strategies

MCPManager supports multiple health check strategies:
1. **TOOL_LISTING**: Check if tool listing works
2. **PING**: Use a lightweight ping method
3. **SPECIFIC_TOOL**: Invoke a specific tool
4. **CUSTOM**: Use a custom health check function

### Health Check Process

```typescript
// Start periodic health checks
private startHealthChecks(intervalMs = 30000) {
  // Clear any existing interval
  if (this.healthCheckInterval) {
    clearInterval(this.healthCheckInterval);
  }
  
  // Set up new interval
  const interval = setInterval(async () => {
    try {
      this.logger.debug('Running scheduled health check');
      const healthStatus = await this.checkServerHealth();
      
      // Log any unhealthy servers with detailed metrics
      for (const [id, healthy] of healthStatus) {
        if (!healthy) {
          // Get detailed health metrics for better reporting
          const metrics = this.getHealthMetrics().get(id);
          this.logger.warn('Server health check failed', { 
            id,
            status: metrics?.status,
            checkCount: metrics?.health?.checkCount,
            failureCount: metrics?.health?.failureCount,
            consecutiveFailures: metrics?.health?.consecutiveFailures,
            lastError: metrics?.health?.lastError
          });
        }
      }
    } catch (error) {
      this.logger.error('Error during health check', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, intervalMs);
  
  // Store the interval ID
  this.healthCheckInterval = interval;
}
```

### Health Metrics

MCPManager tracks comprehensive health metrics:
- **isHealthy**: Overall health status
- **lastCheckTime**: Timestamp of last check
- **responseTimeMs**: Last response time
- **checkCount**: Total number of checks performed
- **failureCount**: Total number of failed checks
- **consecutiveFailures**: Current streak of failures
- **lastError**: Last error message if failed
- **checkHistory**: History of recent checks

## Service Dependencies

### Required Dependencies

- **ConfigManager**: For validating server configurations
- **MCPServerImpl**: For creating and managing server instances
- **Logger**: For logging operations and errors

### Optional Dependencies

- None; MCPManager is self-contained once instantiated

## Service Instantiation Patterns

### System-Level MCPManager

```typescript
// In manager initialization
const systemMcpManager = new MCPManager();

// Start servers based on system tool configurations
const active = await mandrakeManager.tools.getActive();
const toolConfigs = await mandrakeManager.tools.getConfigSet(active);

for (const [toolName, config] of Object.entries(toolConfigs)) {
  if (!config) continue;
  try {
    await systemMcpManager.startServer(toolName, config);
  } catch (serverError) {
    console.warn(`Failed to start server for system tool ${toolName}:`, serverError);
  }
}
```

### Workspace-Level MCPManager

```typescript
// For each workspace
const mcpManager = new MCPManager();

// Start servers based on workspace tool configurations
const active = await workspaceManager.tools.getActive();
const toolConfigs = await workspaceManager.tools.getConfigSet(active);

for (const [name, config] of Object.entries(toolConfigs)) {
  if (!config) continue;
  try {
    await mcpManager.startServer(name, config);
  } catch (serverError) {
    console.warn(`Failed to start server for tool ${name}:`, serverError);
  }
}
```

## Current Usage in API

### Initialization Context

- **System Level**: Created once in initializeManagers
- **Workspace Level**: Created once per workspace in loadWorkspace

### API Routes Usage

```typescript
// Tool invocation
app.post('/invoke', async (c) => {
  const { serverId, toolName, params } = await c.req.json();
  const result = await mcpManager.invokeTool(serverId, toolName, params || {});
  return c.json(result);
});

// Server status
app.get('/status/:serverId', async (c) => {
  const serverId = c.req.param('serverId');
  const serverState = mcpManager.getServerState(serverId);
  return c.json({ 
    status: 'running',
    state: serverState
  });
});
```

### Session Coordinator Integration

```typescript
// In SessionCoordinator constructor
constructor(readonly opts: SessionCoordinatorOptions) {
  // Requires MCPManager from options
  this.mcpManager = opts.mcpManager;
}

// Later, when invoking tools
const result = await this.mcpManager.invokeTool(serverId, methodName, args);
```

## Known Issues and Limitations

1. **No Process Monitoring**: Limited visibility into child process resource usage
2. **Manual Server Restart**: No automatic restart on failure
3. **Limited Error Recovery**: Basic error handling without sophisticated recovery
4. **No Resource Limits**: No constraints on memory/CPU usage for child processes
5. **Restart Handling**: Restart is implemented as stop+start which loses existing session context

## Improvement Recommendations

### 1. Enhanced Process Monitoring

- Add detailed process statistics (CPU, memory usage)
- Implement regular resource monitoring
- Add configurable thresholds for resource usage
- Implement alerts for resource exhaustion

```typescript
// Example implementation
interface ProcessStats {
  cpu: number;  // CPU percentage
  memory: number;  // Memory usage in bytes
  uptime: number;  // Process uptime in seconds
  status: 'running' | 'stopped' | 'crashed';
}

// Add to MCPManager
async getProcessStats(serverId: string): Promise<ProcessStats> {
  // Implementation would use process.pid and something like node-ps
}
```

### 2. Automatic Recovery

- Implement automatic restart on failure
- Add exponential backoff for repeated failures
- Add circuit breaker pattern for persistent failures
- Implement health-based recovery strategies

```typescript
// Example implementation
interface RecoveryOptions {
  maxRetries: number;
  backoffFactor: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

// Add to MCPManager
async enableAutoRecovery(serverId: string, options?: RecoveryOptions): Promise<void> {
  // Implementation would setup server monitoring and auto-restart
}
```

### 3. Resource Constraints

- Add configurable resource limits for child processes
- Implement graceful degradation when limits are approached
- Add monitoring and alerting for resource constraints
- Implement process isolation strategies

```typescript
// Example implementation
interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxChildProcesses: number;
}

// Add to ServerConfig
resourceLimits?: ResourceLimits;
```

### 4. Graceful Restart

- Implement in-place restart without losing context
- Add session transfer between old and new processes
- Implement zero-downtime restarts
- Add request draining during restarts

```typescript
// Example implementation
async gracefulRestart(serverId: string, options?: {
  drainTimeoutMs?: number;
  forceAfterMs?: number;
}): Promise<void> {
  // Implementation would handle request draining and context transfer
}
```

### 5. Enhanced Completions Support

- Add better completion cache
- Implement completion context transfer during restarts
- Add server-specific completion strategies
- Implement client-side completion filtering

## Implementation Plan

1. **Enhance Process Monitoring**:
   - Add process statistics collection
   - Implement resource monitoring
   - Add monitoring endpoints

2. **Implement Automatic Recovery**:
   - Add retry logic with backoff
   - Implement circuit breaker
   - Add recovery strategies

3. **Add Resource Management**:
   - Implement resource limits
   - Add monitoring for resource usage
   - Implement graceful degradation

4. **Enhance Restart Mechanism**:
   - Implement graceful restart
   - Add context transfer
   - Implement request draining

5. **Improve Completions**:
   - Add completion caching
   - Implement better completion context
   - Add client-side filtering