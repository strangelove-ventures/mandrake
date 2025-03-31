# Service Registry

The Service Registry provides a centralized system for registering, initializing, and managing services in the Mandrake API.

## Overview

The Service Registry is a core architectural component that manages the lifecycle of all services within Mandrake. It handles dependency-based initialization, workspace-specific service instances, lazy loading, and graceful cleanup.

## Key Features

- **Centralized Service Management**: Single point of access for all services
- **Dependency Resolution**: Automatically resolves service dependencies
- **Lazy Service Creation**: Services are created on demand via factories
- **Workspace Isolation**: Per-workspace service instances
- **Type-Safe Access**: Specialized getters for common services
- **Health Monitoring**: Service status tracking and reporting
- **Graceful Cleanup**: Orderly shutdown of services

## Core Interfaces

### ServiceRegistry

The main interface for interacting with services:

```typescript
export interface ServiceRegistry {
  // Service registration methods
  registerService<T extends ManagedService>(type: string, instance: T, options?: ServiceOptions): void;
  registerWorkspaceService<T extends ManagedService>(workspaceId: string, type: string, instance: T, options?: ServiceOptions): void;
  registerServiceFactory<T extends ManagedService>(type: string, factory: () => T, options?: ServiceOptions): void;
  registerWorkspaceServiceFactory<T extends ManagedService>(workspaceId: string, type: string, factory: () => T, options?: ServiceOptions): void;
  registerWorkspaceFactoryFunction<T extends ManagedService>(type: string, factoryFn: (workspaceId: string) => T, options?: ServiceOptions): void;
  
  // Service access methods
  getService<T extends ManagedService>(type: string): T | null;
  getWorkspaceService<T extends ManagedService>(workspaceId: string, type: string): T | null;
  
  // Lifecycle management
  initializeServices(): Promise<void>;
  cleanupServices(): Promise<void>;
  
  // Status monitoring
  getServiceStatus(type: string, workspaceId?: string): Promise<ServiceStatus | null>;
  getAllServiceStatuses(): Promise<Map<string, ServiceStatus>>;
  
  // Type-safe manager access
  getMandrakeManager(): Promise<MandrakeManager>;
  getMCPManager(workspaceId?: string): Promise<MCPManager>;
  getWorkspaceManager(workspaceId: string): Promise<WorkspaceManager>;
  getSessionCoordinator(workspaceId?: string): Promise<SessionCoordinator>;
  
  // Convenience methods
  registerStandardServices(home: string, logger?: Logger): void;
  registerWorkspaceServices(workspaceId: string): void;
  ensureServices(requiredServices: string[], workspaceId?: string): Promise<void>;
  
  // Helper methods for service creation and registration
  createAndRegisterService<T extends ManagedService>(
    type: string,
    adapterClass: new (instance: any, options?: any) => T,
    creationOptions: ServiceCreationOptions,
    registrationOptions?: ServiceOptions
  ): T;
  
  createAndRegisterWorkspaceService<T extends ManagedService>(
    workspaceId: string,
    type: string,
    adapterClass: new (instance: any, options?: any) => T,
    creationOptions: Omit<ServiceCreationOptions, 'workspaceId'>,
    registrationOptions?: ServiceOptions
  ): T;
}
```

### ManagedService

Interface that all services must implement:

```typescript
export interface ManagedService {
  init(): Promise<void>;
  isInitialized(): boolean;
  cleanup(): Promise<void>;
  getStatus(): Promise<ServiceStatus>;
}
```

## Service Adapters

Adapters wrap core manager implementations to provide the `ManagedService` interface:

- **MandrakeManagerAdapter**: System configuration and workspace management
- **MCPManagerAdapter**: Tool server management
- **WorkspaceManagerAdapter**: Workspace operations
- **SessionCoordinatorAdapter**: Session handling and LLM interactions

## Usage Examples

### Basic Service Registry Setup

```typescript
import { ServiceRegistryImpl } from './services/registry';
import { ConsoleLogger } from '@mandrake/utils';

// Create the registry with a custom logger
const logger = new ConsoleLogger({ meta: { component: 'ServiceRegistry' } });
const registry = new ServiceRegistryImpl({ logger });

// Register standard services
registry.registerStandardServices('/path/to/mandrake/home', logger);

// Initialize all services
await registry.initializeServices();
```

### Using Type-Safe Manager Access

```typescript
// Get the MandrakeManager (system-wide)
const mandrakeManager = await registry.getMandrakeManager();
const workspaces = await mandrakeManager.listWorkspaces();

// Get an MCP Manager (workspace-specific)
const mcpManager = await registry.getMCPManager('workspace-123');
await mcpManager.startServer('ripper', { port: 3010 });

// Get a workspace manager
const workspaceManager = await registry.getWorkspaceManager('workspace-123');
const config = await workspaceManager.getConfig();

// Get a session coordinator
const sessionCoordinator = await registry.getSessionCoordinator('workspace-123');
const session = await sessionCoordinator.createSession({ model: 'gpt-4' });
```

### Manual Service Registration

```typescript
// Register a global service
registry.registerService(
  'custom-service',
  customServiceInstance,
  {
    dependencies: ['mandrake-manager'],
    initializationPriority: 50
  }
);

// Register a workspace service
registry.registerWorkspaceService(
  'workspace-123',
  'custom-workspace-service',
  customWorkspaceServiceInstance,
  {
    dependencies: ['workspace-123:workspace-manager'],
    initializationPriority: 40
  }
);
```

### Creating and Registering Services

```typescript
// Create and register a custom service
const customAdapter = registry.createAndRegisterService(
  'custom-service',
  CustomServiceAdapter,
  {
    instance: customService,
    logger: new ConsoleLogger({ meta: { service: 'CustomService' } }),
    options: { 
      configPath: '/path/to/config.json'
    }
  },
  {
    dependencies: ['mandrake-manager'],
    initializationPriority: 50
  }
);

// Create and register a workspace service
const workspaceAdapter = registry.createAndRegisterWorkspaceService(
  'workspace-123',
  'custom-workspace-service',
  CustomWorkspaceAdapter,
  {
    instance: customWorkspaceService,
    logger: new ConsoleLogger({ 
      meta: { service: 'CustomWorkspaceService', workspaceId: 'workspace-123' } 
    }),
    options: { 
      workspacePath: '/path/to/workspace' 
    }
  },
  {
    dependencies: ['workspace-123:workspace-manager'],
    initializationPriority: 30
  }
);
```

## Service Options

```typescript
export interface ServiceOptions {
  /** Services that must be initialized before this service */
  dependencies?: string[];
  
  /** Optional priority for initialization (higher is initialized earlier) */
  initializationPriority?: number;
  
  /** Optional metadata for the service */
  metadata?: Record<string, any>;
}
```

## Service Creation Options

```typescript
export interface ServiceCreationOptions {
  /** The service instance to adapt */
  instance: any;
  
  /** Optional service-specific options */
  options?: Record<string, any>;
  
  /** Optional logger to use */
  logger?: Logger;
  
  /** Optional workspace ID for workspace services */
  workspaceId?: string;
  
  /** Optional metadata for the service */
  metadata?: Record<string, any>;
}
```

## Best Practices

1. **Service Dependencies**: Always specify dependencies correctly to ensure proper initialization order
2. **Initialization Priorities**: Use higher values for foundational services
3. **Workspace Services**: Include the workspace manager as a dependency for workspace services
4. **Lazy Loading**: Use factory functions for services that are only needed occasionally
5. **Error Handling**: Implement robust error handling in service initializers and cleanups
6. **Logging**: Provide a logger with appropriate metadata for each service
7. **Cleanup**: Ensure all resources are properly released in cleanup methods