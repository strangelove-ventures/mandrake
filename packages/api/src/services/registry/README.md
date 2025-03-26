# Service Registry

The Service Registry provides a centralized system for registering, initializing, and managing services in the Mandrake API.

## Features

- Centralized service management
- Dependency-based initialization order
- Priority-based initialization
- Workspace-scoped services
- Service health status reporting
- Graceful service cleanup

## Core Components

- **ServiceRegistry**: Central interface for managing services
- **ManagedService**: Interface that all managed services must implement
- **Service Adapters**: Adapters that wrap existing services to implement the ManagedService interface
- **Helper Functions**: Utilities for creating and registering services

## Service Registration Helpers

To simplify service registration, we provide helper functions that reduce boilerplate code.

### Basic Usage

```typescript
import { ServiceRegistryImpl, createAndRegisterService } from './services/registry';
import { MandrakeManagerAdapter } from './services/registry/adapters';
import { MandrakeManager } from '@mandrake/workspace';
import { ConsoleLogger } from '@mandrake/utils';

// Initialize service registry
const serviceRegistry = new ServiceRegistryImpl();

// Create MandrakeManager
const mandrakeManager = new MandrakeManager('/path/to/mandrake/home');

// Create and register MandrakeManagerAdapter
const mandrakeAdapter = createAndRegisterService(
  serviceRegistry,
  'mandrake-manager',
  MandrakeManagerAdapter,
  {
    instance: mandrakeManager,
    logger: new ConsoleLogger({ meta: { service: 'MandrakeManagerAdapter' } })
  },
  {
    dependencies: [],
    initializationPriority: 100  // Highest priority - initialize first
  }
);

// Initialize all services
await serviceRegistry.initializeServices();
```

### Workspace Services

For workspace-scoped services, use the dedicated helper:

```typescript
import { createAndRegisterWorkspaceService } from './services/registry';
import { WorkspaceManagerAdapter } from './services/registry/adapters';

// Create and register WorkspaceManager for a specific workspace
const wsAdapter = createAndRegisterWorkspaceService(
  serviceRegistry,
  workspaceId,
  'workspace-manager',
  WorkspaceManagerAdapter,
  {
    instance: workspaceManager,
    logger: new ConsoleLogger({ meta: { service: 'WorkspaceManagerAdapter' } })
  },
  {
    dependencies: ['mandrake-manager'],
    initializationPriority: 10
  }
);
```

## Helper Function Parameters

### `createAndRegisterService`

```typescript
function createAndRegisterService<T extends ManagedService>(
  registry: ServiceRegistry,
  type: string,
  adapterClass: new (instance: any, options?: any) => T,
  creationOptions: ServiceCreationOptions,
  registrationOptions?: ServiceRegistrationOptions
): T
```

**Parameters:**
- `registry`: The ServiceRegistry to register with
- `type`: The service type identifier (e.g., 'mandrake-manager')
- `adapterClass`: The adapter class constructor
- `creationOptions`: Options for creating the service (instance, logger, etc.)
- `registrationOptions`: Options for registering the service (dependencies, priority)

### `createAndRegisterWorkspaceService`

```typescript
function createAndRegisterWorkspaceService<T extends ManagedService>(
  registry: ServiceRegistry,
  workspaceId: string,
  type: string,
  adapterClass: new (instance: any, options?: any) => T,
  creationOptions: Omit<ServiceCreationOptions, 'workspaceId'>,
  registrationOptions?: ServiceRegistrationOptions
): T
```

**Parameters:**
- Same as `createAndRegisterService` plus `workspaceId`

## ServiceCreationOptions

```typescript
interface ServiceCreationOptions {
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

## ServiceRegistrationOptions

```typescript
interface ServiceRegistrationOptions {
  /** Optional dependencies for the service */
  dependencies?: string[];
  
  /** Optional initialization priority (higher is initialized earlier) */
  initializationPriority?: number;
  
  /** Optional metadata for the service */
  metadata?: Record<string, any>;
}
```

## Best Practices

1. Always specify dependencies correctly to ensure proper initialization order
2. Use high priority values for foundational services (like MandrakeManager)
3. For workspace services, include the base manager as a dependency
4. Create a consistent logger for each service with appropriate metadata
5. Clean up resources properly in adapter cleanup methods
6. Provide detailed status information in getStatus implementations

## Example

See the `examples/helper-usage.ts` file for detailed usage examples.