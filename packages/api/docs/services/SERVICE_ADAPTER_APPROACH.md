# Service Adapter Approach

This document explains the approach we're taking to adapt existing services to work with the ServiceRegistry architecture, focusing on the adapters we've implemented and planned.

## Overview of Service Registry Architecture

The Service Registry architecture provides a consistent framework for managing service lifecycle, dependencies, and status:

1. **Centralized Management**: The ServiceRegistry manages all service initialization and cleanup
2. **Dependency-Aware Operations**: Services initialize in dependency order, clean up in reverse
3. **Health Monitoring**: Consistent status reporting across all services
4. **Clean Separation**: Global services vs. workspace-specific services
5. **Graceful Failure Handling**: Robust error handling during initialization and cleanup

## The Adapter Pattern

To incorporate existing managers (MandrakeManager, WorkspaceManager, MCPManager, etc.) into the ServiceRegistry architecture without modifying their existing implementations, we use the Adapter pattern:

```
┌────────────────┐       ┌───────────────────┐       ┌───────────────┐
│ ServiceRegistry│───────│ *ManagerAdapter   │───────│ *Manager      │
└────────────────┘       └───────────────────┘       └───────────────┘
       │                        implements             (unchanged)
       │                           │
       │                  ┌────────────────┐
       └──────────────────│ ManagedService │
                          └────────────────┘
```

Each adapter:
1. Implements the `ManagedService` interface required by ServiceRegistry
2. Wraps an existing manager instance
3. Delegates calls to the underlying manager
4. Provides additional lifecycle management (initialization, cleanup)
5. Reports status information in a consistent format

## Implemented Adapters

We've implemented four key adapters so far:

### 1. MandrakeManagerAdapter

**Purpose**: Adapt the top-level MandrakeManager, which manages global configuration and workspace registry.

**Key Features**:
- Initializes global Mandrake directory structure
- Manages system-level managers
- Reports overall Mandrake health status
- Provides workspace management functionality

**Dependency Position**: Highest priority, initialized first

### 2. WorkspaceManagerAdapter

**Purpose**: Adapt individual WorkspaceManager instances, which manage workspace-specific resources.

**Key Features**:
- Initializes workspace directory structure
- Manages workspace-specific sub-managers
- Reports workspace health status
- Ensures proper resource cleanup

**Dependency Position**: Depends on MandrakeManager

### 3. MCPManagerAdapter

**Purpose**: Adapt MCPManager instances, which manage MCP server processes.

**Key Features**:
- Starts and stops servers based on configuration
- Handles Docker container lifecycle
- Reports detailed server health metrics
- Manages server error recovery

**Dependency Position**: Depends on WorkspaceManager for directory structure

### 4. SessionCoordinatorAdapter

**Purpose**: Adapt SessionCoordinator instances, which manage streaming sessions and rounds.

**Key Features**:
- Tracks coordinator activity and idle time
- Manages session lifecycle for streaming responses
- Associates coordinators with specific sessions
- Enforces proper resource management for long-running streams
- Provides transparent proxying of underlying coordinator methods

**Dependency Position**: Depends on MCPManager, WorkspaceManager, or MandrakeManager based on session type

## Planned Adapters

We plan to implement additional adapters to complete the service ecosystem:

1. **ToolsManagerAdapter**: For tool configuration management
2. **ModelsManagerAdapter**: For model configuration management

## Integration Example

```typescript
// Create the service registry
const registry = new ServiceRegistryImpl();

// Create and register MandrakeManager (global service)
const mandrakeManager = new MandrakeManager(mandrakeRoot);
const mandrakeAdapter = new MandrakeManagerAdapter(mandrakeManager);
registry.registerService('mandrake-manager', mandrakeAdapter, {
  initializationPriority: 100
});

// Create and register WorkspaceManager (workspace-specific)
const workspace = new WorkspaceManager(parentDir, name, id);
const workspaceAdapter = new WorkspaceManagerAdapter(workspace);
registry.registerWorkspaceService(id, 'workspace-manager', workspaceAdapter, {
  dependencies: ['mandrake-manager'],
  initializationPriority: 50
});

// Create and register MCPManager (workspace-specific)
const mcpManager = new MCPManager();
const mcpAdapter = new MCPManagerAdapter(mcpManager, toolConfig, configId);
registry.registerWorkspaceService(id, 'mcp-manager', mcpAdapter, {
  dependencies: ['workspace-manager'],
  initializationPriority: 10
});

// Initialize all services in dependency order
await registry.initializeServices();

// Get service health information
const statuses = registry.getAllServiceStatuses();

// Clean up all services
await registry.cleanupServices();
```

## Benefits of the Adapter Approach

1. **Non-Invasive**: Existing manager implementations remain unchanged
2. **Consistent Interface**: All services implement the same ManagedService interface
3. **Graceful Cleanup**: Ensures proper resource release even during errors
4. **Dependency Management**: Clear ordering of initialization and cleanup
5. **Health Metrics**: Standardized status reporting across all services
6. **Future Extensibility**: New services can be easily added to the registry

## Implementation Challenges

1. **Error Propagation**: Balancing when to throw vs. collect errors
2. **Status Reporting**: Determining appropriate health metrics for each service
3. **Resource Management**: Ensuring all resources are properly released
4. **Proxy Method Selection**: Deciding which methods to proxy vs. which to leave as manager-only
5. **Test Environment Considerations**: Testing services with Docker dependencies

## Next Steps

1. Complete remaining adapters for other managers
2. Enhance error logging and reporting
3. Add metrics collection for performance monitoring
4. Update API routes to use ServiceRegistry for manager access
5. Document integration patterns for future service adapters