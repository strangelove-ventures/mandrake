# Service Adapters

This directory contains adapter classes that implement the ManagedService interface for existing services, allowing them to be used with the ServiceRegistry.

## Implemented Adapters

We have implemented the following adapters:

1. **MandrakeManagerAdapter**: Adapts the MandrakeManager service, which manages the global Mandrake configuration and workspace registry.

2. **WorkspaceManagerAdapter**: Adapts the WorkspaceManager service, which manages a single workspace's configuration and resources.

3. **MCPManagerAdapter**: Adapts the MCPManager service, which manages MCP servers for tool execution.

4. **SessionCoordinatorAdapter**: Adapts the SessionCoordinator service, which manages streaming sessions and round processing.

## Adapter Pattern

Each adapter implements the ManagedService interface defined in `../types.ts` and wraps an existing service to provide:

- Lifecycle management (initialization, cleanup)
- Health status reporting
- Dependency resolution (via the ServiceRegistry)

The adapter pattern allows us to integrate existing services with the ServiceRegistry without modifying their implementation.

### Common Implementation Pattern

All adapters follow a similar implementation pattern:

```typescript
export class SomeManagerAdapter implements ManagedService {
  private initialized = false;
  private logger: Logger;
  
  constructor(
    private readonly manager: SomeManager,
    options?: { logger?: Logger }
  ) {
    this.logger = options?.logger || new ConsoleLogger({
      meta: { service: 'SomeManagerAdapter' }
    });
  }
  
  // Initialize the manager
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('Already initialized');
      return;
    }
    
    try {
      await this.manager.init();
      this.initialized = true;
    } catch (error) {
      // Log and rethrow with context
      throw new Error(`Initialization failed: ${error}`);
    }
  }
  
  // Check initialization status
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // Clean up resources
  async cleanup(): Promise<void> {
    if (!this.initialized) return;
    
    try {
      // Perform cleanup steps specific to this manager
      // Collect but don't throw errors to ensure full cleanup
      this.initialized = false;
    } catch (error) {
      // Log errors but don't throw to prevent blocking other service cleanup
    }
  }
  
  // Report health status
  getStatus(): ServiceStatus {
    return {
      isHealthy: this.initialized && /* other health checks */,
      message: "Status message",
      statusCode: 200, // or appropriate status code
      details: {
        // Manager-specific status details
      }
    };
  }
  
  // Get the underlying manager
  getManager(): SomeManager {
    return this.manager;
  }
  
  // Optional: Proxy important methods from the underlying manager
}
```

## Implementation Status

### Completed Adapters

- ✅ **MandrakeManagerAdapter**: Global configuration and workspace registry
- ✅ **WorkspaceManagerAdapter**: Individual workspace management
- ✅ **MCPManagerAdapter**: MCP server management
- ✅ **SessionCoordinatorAdapter**: Session coordination and round management

## Integration with ServiceRegistry

The ServiceRegistry manages dependencies and lifecycle operations for these adapted services. Key integration points:

```typescript
// Create adapters for underlying services
const mandrakeAdapter = new MandrakeManagerAdapter(mandrakeManager);
const workspaceAdapter = new WorkspaceManagerAdapter(workspaceManager);
const mcpAdapter = new MCPManagerAdapter(mcpManager, toolConfig, configId);

// Register with the service registry with proper dependencies
registry.registerService('mandrake-manager', mandrakeAdapter, {
  initializationPriority: 100
});

registry.registerWorkspaceService(workspaceId, 'workspace-manager', workspaceAdapter, {
  dependencies: ['mandrake-manager'],
  initializationPriority: 50
});

registry.registerWorkspaceService(workspaceId, 'mcp-manager', mcpAdapter, {
  dependencies: ['workspace-manager'],
  initializationPriority: 10
});

// Initialize services in dependency order
await registry.initializeServices();

// Get service instances
const mandrake = registry.getService('mandrake-manager');
const workspace = registry.getWorkspaceService(workspaceId, 'workspace-manager');

// Cleanup all services in reverse dependency order
await registry.cleanupServices();
```

## Special Adapter: SessionCoordinatorAdapter

The SessionCoordinatorAdapter is unique because:

1. **On-Demand Creation**: SessionCoordinators are typically created on-demand when needed
2. **Activity Tracking**: It tracks activity state and idle time
3. **Session-Specific**: Each adapter is associated with a specific session ID
4. **Resource Management**: Helps prevent memory leaks from orphaned coordinators
5. **Proxied API**: Wraps the streaming API to manage activity state

Example usage:

```typescript
// Create a SessionCoordinator
const coordinator = new SessionCoordinator({
  metadata: { name: "workspace-name", path: workspacePath },
  promptManager: workspace.prompt,
  sessionManager: workspace.sessions,
  mcpManager: mcpManager,
  modelsManager: workspace.models,
  filesManager: workspace.files,
  dynamicContextManager: workspace.dynamic
});

// Create the adapter
const coordinatorAdapter = new SessionCoordinatorAdapter(
  coordinator,
  sessionId,
  {
    workspaceId: workspaceId,
    workspaceName: workspace.name
  }
);

// Register with the registry
registry.registerWorkspaceService(
  workspaceId,
  `session-coordinator-${sessionId}`,
  coordinatorAdapter,
  {
    dependencies: ['workspace-manager', 'mcp-manager']
  }
);
```

## Design Considerations

- **Error Handling**: All adapters catch and collect errors during cleanup rather than throwing, to prevent blocking other service cleanups.
- **Health Reporting**: Status reporting includes human-readable messages, status codes, and detailed health metrics.
- **Resource Management**: Adapters ensure proper cleanup of all resources, including database connections and server processes.
- **Proxy Methods**: Important methods are proxied to maintain the original API while adding lifecycle management.
- **Dependency Management**: Services are registered with clear dependencies to ensure proper initialization and cleanup order.