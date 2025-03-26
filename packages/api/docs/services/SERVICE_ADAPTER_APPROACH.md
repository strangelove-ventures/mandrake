# Service Adapter Approach for Mandrake API

## Overview

The service adapter approach provides a consistent interface for accessing and managing services in the Mandrake API. This document outlines the adapter pattern implementation for integrating existing services with the enhanced service registry.

## Core Concepts

### 1. ManagedService Interface

All services in the system implement a common interface that defines their lifecycle:

```typescript
interface ManagedService {
  init(): Promise<void>;
  isInitialized(): boolean;
  cleanup(): Promise<void>;
  getStatus(): ServiceStatus;
}
```

### 2. Service Adapters

Rather than modifying existing service implementations directly, we create adapter classes that wrap the original services:

```typescript
class ServiceAdapter<T> implements ManagedService {
  constructor(
    private readonly service: T,
    private readonly initFn?: (service: T) => Promise<void>,
    private readonly cleanupFn?: (service: T) => Promise<void>,
    private readonly statusFn?: (service: T) => ServiceStatus
  ) {}

  async init(): Promise<void> {
    if (this.initFn) {
      await this.initFn(this.service);
    } else if ('init' in this.service && typeof this.service.init === 'function') {
      await (this.service as any).init();
    }
  }

  isInitialized(): boolean {
    if ('isInitialized' in this.service && typeof this.service.isInitialized === 'function') {
      return (this.service as any).isInitialized();
    }
    return true; // Assume initialized if not explicitly indicated
  }

  async cleanup(): Promise<void> {
    if (this.cleanupFn) {
      await this.cleanupFn(this.service);
    } else if ('cleanup' in this.service && typeof this.service.cleanup === 'function') {
      await (this.service as any).cleanup();
    } else if ('close' in this.service && typeof this.service.close === 'function') {
      await (this.service as any).close();
    }
  }

  getStatus(): ServiceStatus {
    if (this.statusFn) {
      return this.statusFn(this.service);
    } else if ('getStatus' in this.service && typeof this.service.getStatus === 'function') {
      return (this.service as any).getStatus();
    }
    return { isHealthy: true };
  }

  // Method to access the wrapped service
  getService(): T {
    return this.service;
  }
}
```

### 3. Specialized Adapters

For specific services with unique requirements, we create specialized adapter implementations:

```typescript
class MCPManagerAdapter implements ManagedService {
  constructor(private readonly mcpManager: MCPManager) {}

  async init(): Promise<void> {
    // MCPManager doesn't require explicit initialization
    // It starts servers when requested
  }

  isInitialized(): boolean {
    return true; // MCPManager is always considered initialized
  }

  async cleanup(): Promise<void> {
    // Clean up all running servers
    await this.mcpManager.cleanup();
  }

  getStatus(): ServiceStatus {
    // Get detailed status from all servers
    const servers = this.mcpManager.getServers();
    const allHealthy = servers.every(server => server.isRunning());
    
    return {
      isHealthy: allHealthy,
      details: {
        serverCount: servers.length,
        servers: servers.map(s => ({
          id: s.getId(),
          running: s.isRunning()
        }))
      }
    };
  }

  // Method to access the wrapped service
  getService(): MCPManager {
    return this.mcpManager;
  }
}
```

## Service Adapter Registry Integration

The service adapters integrate with the enhanced service registry:

```typescript
// Initialize the registry
const registry = new ServiceRegistryImpl();

// Register adapters for existing services
registry.registerService('mandrakeManager', new MandrakeManagerAdapter(mandrakeManager));
registry.registerService('mcpManager', new MCPManagerAdapter(mcpManager));

// Register a workspace service adapter
registry.registerWorkspaceService(
  workspaceId,
  'workspaceManager',
  new WorkspaceManagerAdapter(workspaceManager)
);

// Use factory functions for dynamically created services
registry.registerServiceFactory('sessionCoordinator', async (registry) => {
  const mandrakeManager = registry.getService('mandrakeManager')?.getService();
  const mcpManager = registry.getService('mcpManager')?.getService();
  
  if (!mandrakeManager || !mcpManager) {
    throw new Error('Required dependencies not available');
  }
  
  const coordinator = new SessionCoordinator({
    metadata: { name: 'system', path: mandrakeManager.paths.root },
    sessionManager: mandrakeManager.sessions,
    promptManager: mandrakeManager.prompt,
    mcpManager,
    modelsManager: mandrakeManager.models
  });
  
  return new ServiceAdapter(coordinator);
});

// Register a workspace-specific factory function
registry.registerWorkspaceFactoryFunction('sessionCoordinator', async (registry, workspaceId) => {
  const workspace = registry.getWorkspaceService(workspaceId, 'workspaceManager')?.getService();
  const mcpManager = registry.getWorkspaceService(workspaceId, 'mcpManager')?.getService();
  
  if (!workspace || !mcpManager) {
    throw new Error(`Required dependencies not available for workspace ${workspaceId}`);
  }
  
  const coordinator = new SessionCoordinator({
    metadata: { name: workspace.name, path: workspace.paths.root },
    sessionManager: workspace.sessions,
    promptManager: workspace.prompt,
    mcpManager,
    modelsManager: workspace.models,
    filesManager: workspace.files,
    dynamicContextManager: workspace.dynamic
  });
  
  return new ServiceAdapter(coordinator);
});
```

## Implementation Notes

When implementing adapters for the enhanced service registry:

1. **Minimal Modification**: The adapter approach minimizes changes to existing service implementations

2. **Consistent Interface**: All services present a uniform interface for lifecycle management

3. **Dependency Resolution**: The registry handles service dependencies through factory functions

4. **Service Access**: API routes access services through the registry with consistent patterns

5. **Error Handling**: Adapters provide consistent error handling for lifecycle operations

## Adapter Implementation Priorities

1. **Core Manager Adapters**:
   - MandrakeManagerAdapter
   - WorkspaceManagerAdapter
   - MCPManagerAdapter
   - SessionCoordinatorAdapter

2. **Secondary Adapters**:
   - ToolsManagerAdapter
   - ModelsManagerAdapter
   - PromptManagerAdapter

3. **Helper Adapters**:
   - FilesManagerAdapter
   - DynamicContextManagerAdapter

## Testing Approach

For testing service adapters:

1. Create test instances of real services in temporary directories

2. Wrap them in appropriate adapters

3. Register them with the service registry

4. Test lifecycle methods (init, cleanup) and verify proper resource management

5. Ensure adapters correctly delegate to underlying services

Example test:

```typescript
test('MCPManagerAdapter should properly cleanup servers on shutdown', async () => {
  // Create a real MCPManager instance
  const mcpManager = new MCPManager();
  
  // Start some test servers
  await mcpManager.startServer('test1', testConfig1);
  await mcpManager.startServer('test2', testConfig2);
  
  // Create adapter
  const adapter = new MCPManagerAdapter(mcpManager);
  
  // Call cleanup
  await adapter.cleanup();
  
  // Verify all servers are stopped
  expect(mcpManager.getServers().length).toBe(0);
});
```

## Conclusion

The service adapter approach provides a clean way to integrate existing services with the enhanced service registry, maintaining backward compatibility while enabling new features like lazy initialization and proper lifecycle management.
