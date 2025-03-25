# Mandrake API Services Architecture Plan - Revised

This document outlines the refined plan for improving the services architecture in the Mandrake API package, with a focus on centralized service lifecycle management through a Service Registry.

## Implementation Status

As of March 2025:

- ✅ **ServiceRegistry Implementation**: Completed with dependency ordering and lifecycle management
- ✅ **Core Service Adapters**: Implemented MandrakeManagerAdapter, WorkspaceManagerAdapter, MCPManagerAdapter, and SessionCoordinatorAdapter
- ⏳ **Additional Adapters**: Planned for ToolsManager and ModelsManager
- ⏳ **API Route Integration**: Update routes to use ServiceRegistry for service access

See [SERVICE_ADAPTER_APPROACH.md](./SERVICE_ADAPTER_APPROACH.md) for details on the adapter implementation approach.

## Current Architecture Overview

The Mandrake API manages several types of stateful services with specific considerations for lifecycle management:

1. **Database Connections**: SQLite databases with WAL mode used by session managers
2. **Process Management**: MCP server processes managed by MCPManager instances
3. **Streaming Sessions**: SessionCoordinators that maintain state for streaming responses
4. **File System Operations**: Various managers that read/write configuration files

### Key Service Hierarchy

```sh
MandrakeManager
├── SessionManager (SQLite database)
├── ToolsManager
├── ModelsManager
├── PromptManager
└── MandrakeConfigManager

WorkspaceManager (multiple instances)
├── SessionManager (SQLite database - one per workspace)
├── ToolsManager
├── ModelsManager
├── PromptManager
├── DynamicContextManager
├── FilesManager
└── WorkspaceConfigManager

MCPManager (system-level and workspace-level)
└── MCP Servers (child processes)

SessionCoordinator (system-level and workspace-level)
├── PromptManager
├── ModelsManager
├── FilesManager (for workspace coordinators)
├── DynamicContextManager (for workspace coordinators)
└── MCPManager
```

### Service Initialization Flow

```sh
createApp() → initializeManagers() → loadWorkspaces() → Individual service initialization
```

The initialization flow contains several important aspects:

1. **SQLite Connection Setup**: Both MandrakeManager and WorkspaceManager instantiate SessionManager, which creates a SQLite connection with WAL mode and file locking
2. **Process Spawning**: MCPManager instances start MCP server processes based on tool configurations
3. **SessionCoordinator Creation**: SessionCoordinators are created on-demand when a session is needed, and persist in memory for streaming

## Challenges in Current Implementation

1. **Distributed Service Management**:
   - Service initialization, retrieval, and cleanup logic is spread across multiple files
   - No central registry or tracking of service instances
   - Inconsistent error handling during initialization and cleanup

2. **Process Lifecycle Management**:
   - MCPManager cleanup is handled separately from other services
   - Limited orchestration of startup and shutdown processes

3. **Stream Coordination**:
   - SessionCoordinators created on-demand without central tracking
   - No cleanup mechanism for completed or abandoned streams
   - Potential memory leaks from orphaned coordinators

4. **Lack of Structured Testing**:
   - No comprehensive test suite for service lifecycle management
   - Difficulty testing complex service interactions

## Core Service Registry Architecture

The central improvement will be implementing a Service Registry to manage all service lifecycles in a consistent manner:

```typescript
// Core service registry interface
interface ServiceRegistry {
  // Registration
  registerService<T extends ManagedService>(type: string, instance: T, options?: ServiceOptions): void;
  registerWorkspaceService<T extends ManagedService>(workspaceId: string, type: string, instance: T, options?: ServiceOptions): void;
  
  // Retrieval
  getService<T extends ManagedService>(type: string): T | null;
  getWorkspaceService<T extends ManagedService>(workspaceId: string, type: string): T | null;
  
  // Lifecycle management
  initializeServices(): Promise<void>;
  cleanupServices(): Promise<void>;
  
  // Health and status
  getServiceStatus(type: string, workspaceId?: string): ServiceStatus;
}

// Service lifecycle interface all services should implement
interface ManagedService {
  init(): Promise<void>;
  isInitialized(): boolean;
  cleanup(): Promise<void>;
  getStatus(): ServiceStatus;
}

// Service status interface
interface ServiceStatus {
  isHealthy: boolean;
  statusCode?: number;
  message?: string;
  details?: Record<string, any>;
}

// Implementation of the service registry
class ServiceRegistryImpl implements ServiceRegistry {
  private services = new Map<string, ManagedService>();
  private workspaceServices = new Map<string, Map<string, ManagedService>>();
  private dependencyGraph = new Map<string, string[]>();
  private initialized = false;
  private logger: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger || createDefaultLogger();
  }

  // Implementation of interface methods...
}
```

## Service Lifecycle Phases

Each service will follow a consistent lifecycle pattern:

1. **Registration Phase**:
   - Services are registered with the registry
   - Dependencies are declared
   - No initialization occurs yet

2. **Initialization Phase**:
   - Registry initializes services in dependency order
   - Services create required resources
   - Service state is validated

3. **Active Phase**:
   - Services fulfill their responsibilities
   - Health status is monitored
   - Services may be restarted if needed

4. **Cleanup Phase**:
   - Services release resources in reverse dependency order
   - Resources are gracefully closed or terminated
   - Memory and file handles are released

## Service Registry Implementation

### Service Registration & Dependency Management

```typescript
// Register a service with dependencies
registerService<T extends ManagedService>(
  type: string, 
  instance: T, 
  options?: {
    dependencies?: string[];
    initializationPriority?: number;
  }
): void {
  // Store the service
  this.services.set(type, instance);

  // Store dependencies for initialization order
  if (options?.dependencies) {
    this.dependencyGraph.set(type, options.dependencies);
  }

  this.logger.debug(`Registered service: ${type}`);
}

// Generate initialization order based on dependencies
private getInitializationOrder(): string[] {
  // Topological sort implementation for dependency order
  // This ensures dependent services are initialized first
  // Implementation details...
}
```

### Service Initialization

```typescript
// Initialize all services in dependency order
async initializeServices(): Promise<void> {
  if (this.initialized) {
    this.logger.warn('Services already initialized');
    return;
  }

  const initOrder = this.getInitializationOrder();
  this.logger.info(`Initializing services in order: ${initOrder.join(', ')}`);

  // Initialize global services first
  for (const serviceType of initOrder) {
    const service = this.services.get(serviceType);
    if (!service) continue;

    try {
      this.logger.debug(`Initializing service: ${serviceType}`);
      await service.init();
    } catch (error) {
      this.logger.error(`Failed to initialize service ${serviceType}:`, error);
      throw new Error(`Service initialization failed for ${serviceType}: ${error}`);
    }
  }

  // Then initialize workspace services
  for (const [workspaceId, services] of this.workspaceServices.entries()) {
    for (const serviceType of initOrder) {
      const service = services.get(serviceType);
      if (!service) continue;

      try {
        this.logger.debug(`Initializing workspace service: ${workspaceId}.${serviceType}`);
        await service.init();
      } catch (error) {
        this.logger.error(`Failed to initialize workspace service ${workspaceId}.${serviceType}:`, error);
        throw new Error(`Workspace service initialization failed for ${workspaceId}.${serviceType}: ${error}`);
      }
    }
  }

  this.initialized = true;
  this.logger.info('All services initialized successfully');
}
```

### Service Cleanup

```typescript
// Clean up all services in reverse dependency order
async cleanupServices(): Promise<void> {
  if (!this.initialized) {
    this.logger.warn('Services not initialized, nothing to clean up');
    return;
  }

  const initOrder = this.getInitializationOrder();
  const cleanupOrder = [...initOrder].reverse();
  
  this.logger.info(`Cleaning up services in order: ${cleanupOrder.join(', ')}`);

  // Track errors but continue cleanup
  const errors: Error[] = [];

  // Clean up workspace services first
  for (const [workspaceId, services] of this.workspaceServices.entries()) {
    for (const serviceType of cleanupOrder) {
      const service = services.get(serviceType);
      if (!service) continue;

      try {
        this.logger.debug(`Cleaning up workspace service: ${workspaceId}.${serviceType}`);
        await service.cleanup();
      } catch (error) {
        this.logger.error(`Failed to clean up workspace service ${workspaceId}.${serviceType}:`, error);
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  // Then clean up global services
  for (const serviceType of cleanupOrder) {
    const service = this.services.get(serviceType);
    if (!service) continue;

    try {
      this.logger.debug(`Cleaning up service: ${serviceType}`);
      await service.cleanup();
    } catch (error) {
      this.logger.error(`Failed to clean up service ${serviceType}:`, error);
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  this.initialized = false;
  
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Some services failed to clean up properly');
  }
  
  this.logger.info('All services cleaned up successfully');
}
```

## Adapting Existing Services

To integrate with the service registry, existing services will need to implement the `ManagedService` interface:

```typescript
// Example: Update MCPManager to implement ManagedService
class MCPManager implements ManagedService {
  private initialized = false;
  private servers = new Map<string, MCPServerImpl>();
  private healthCheckInterval: NodeJS.Timer | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    // Start health check interval
    this.startHealthChecks();
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async cleanup(): Promise<void> {
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop all servers
    const serverIds = Array.from(this.servers.keys());
    for (const id of serverIds) {
      await this.stopServer(id).catch(err => {
        console.error(`Error stopping server ${id}:`, err);
      });
    }

    this.servers.clear();
    this.initialized = false;
  }

  getStatus(): ServiceStatus {
    const serverStatuses = new Map<string, boolean>();
    
    // Check each server's status
    for (const [id, server] of this.servers.entries()) {
      serverStatuses.set(id, server.isRunning());
    }
    
    const allHealthy = Array.from(serverStatuses.values())
      .every(status => status === true);
    
    return {
      isHealthy: allHealthy,
      details: {
        serverCount: this.servers.size,
        servers: Object.fromEntries(serverStatuses)
      }
    };
  }
  
  // Existing methods...
}
```

## Testing Strategy

The Service Registry will be tested using real service instances and temporary directories, consistent with the project's existing testing approach. No mocks will be used.

```typescript
// Example test suite structure
describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let tempDir: string;
  
  beforeEach(async () => {
    // Create temp directory for test
    tempDir = await createTempDirectory();
    registry = new ServiceRegistryImpl();
  });
  
  afterEach(async () => {
    // Clean up temp directory
    await removeTempDirectory(tempDir);
  });
  
  test('should initialize services in dependency order', async () => {
    // Create real service instances
    const configManager = new ConfigManager(join(tempDir, 'config'));
    const sessionManager = new SessionManager(join(tempDir, 'db.sqlite'));
    const mcpManager = new MCPManager();
    
    // Register services with dependencies
    registry.registerService('config', configManager);
    registry.registerService('sessions', sessionManager, {
      dependencies: ['config']
    });
    registry.registerService('mcp', mcpManager, {
      dependencies: ['config']
    });
    
    // Initialize all services
    await registry.initializeServices();
    
    // Verify initialization order through side effects
    // (e.g., check that database file exists, etc.)
    expect(configManager.isInitialized()).toBe(true);
    expect(sessionManager.isInitialized()).toBe(true);
    expect(mcpManager.isInitialized()).toBe(true);
  });
  
  test('should clean up services in reverse dependency order', async () => {
    // Setup similar to previous test
    
    // Initialize
    await registry.initializeServices();
    
    // Then clean up
    await registry.cleanupServices();
    
    // Verify cleanup through side effects
    expect(configManager.isInitialized()).toBe(false);
    expect(sessionManager.isInitialized()).toBe(false);
    expect(mcpManager.isInitialized()).toBe(false);
  });
  
  // Additional tests for error handling, dependency cycles, etc.
});
```

## API Integration

The Service Registry will be integrated into the API through the following steps:

1. **Initialization in createApp**:
   - Create a registry instance during app creation
   - Register all services with their dependencies
   - Initialize services before starting the API server

2. **Graceful Shutdown**:
   - Register shutdown handlers to clean up services
   - Ensure proper cleanup order
   - Handle cleanup errors gracefully

3. **Service Access**:
   - Update API routes to access services through the registry
   - Replace direct manager access with registry retrieval

## Implementation Plan

### Phase 1: Service Registry Implementation (2 weeks)

1. **Create Core Service Registry**:
   - Implement the ServiceRegistry interface and implementation
   - Add dependency tracking and order calculation
   - Implement initialization and cleanup sequencing
   - Create comprehensive tests for the registry

2. **Define ManagedService Interface**:
   - Create the ManagedService interface
   - Document implementation requirements
   - Create a basic implementation template

### Phase 2: Adapt Existing Services (2 weeks)

1. **Update Core Managers**:
   - Implement ManagedService for MandrakeManager
   - Implement ManagedService for WorkspaceManager
   - Implement ManagedService for MCPManager
   - Implement ManagedService for SessionManager

2. **Test Service Adaptations**:
   - Create tests for individual service lifecycle
   - Verify proper resource management
   - Test error handling scenarios

### Phase 3: API Integration (1-2 weeks)

1. **Integrate with API Initialization**:
   - Update createApp to use the registry
   - Register all services with dependencies
   - Add graceful shutdown handling

2. **Update API Routes**:
   - Modify routes to access services through registry
   - Handle service access errors consistently
   - Ensure backward compatibility

### Phase 4: Testing and Validation (1 week)

1. **Integration Testing**:
   - Create end-to-end tests for the service lifecycle
   - Verify proper initialization and cleanup
   - Test error recovery scenarios

2. **Stress Testing**:
   - Test with multiple concurrent operations
   - Verify resource cleanup under load
   - Ensure no memory leaks or resource exhaustion

## Next Steps

1. Implement the core ServiceRegistry class with dependency-aware initialization
2. Create the ManagedService interface and default implementation templates
3. Update MCPManager to implement ManagedService (highest priority service)
4. Update MandrakeManager and WorkspaceManager to use the registry
5. Develop a comprehensive test suite for the service registry
6. Integrate the registry into the API initialization flow