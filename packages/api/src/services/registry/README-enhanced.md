# Enhanced Service Registry with Lazy Initialization

The Enhanced Service Registry extends the base ServiceRegistry with lazy service initialization capabilities, allowing services to be created on-demand when they are first requested.

## Key Features

- **Lazy Initialization**: Services are only created when requested, saving resources
- **Factory Registration**: Register service factories instead of concrete instances
- **Automatic Dependency Resolution**: Dependencies are automatically created on demand
- **Standard Service Setup**: One-line registration of all common services
- **Fully Compatible**: Works with existing code that uses the standard ServiceRegistry
- **Workspace Factory Functions**: Can register creation functions for any workspace ID

## Usage

### Basic Setup

```typescript
import { ServiceRegistryImpl } from './services/registry';
import { ConsoleLogger } from '@mandrake/utils';

// Create the registry
const registry = new ServiceRegistryImpl({
  logger: new ConsoleLogger({ meta: { component: 'ServiceRegistry' } })
});

// Register standard services for Mandrake
registry.registerStandardServices('~/.mandrake');

// Initialize pre-registered service factories
await registry.initializeServices();
```

### In Routes

```typescript
import { ServiceRegistryImpl } from '../services/registry';
import { MandrakeManagerAdapter } from '../services/registry/adapters';

export function someRoute(registry: ServiceRegistryImpl): Hono {
  const app = new Hono();
  
  // Helper function to get manager
  const getMandrakeManager = () => {
    const adapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!adapter) {
      throw new Error('MandrakeManager service not available');
    }
    return adapter.getManager();
  };
  
  app.get('/config', async (c) => {
    try {
      // Get the MandrakeManager service (creates it if it doesn't exist)
      const mandrakeManager = getMandrakeManager();
      const config = await mandrakeManager.config.getConfig();
      return c.json(config);
    } catch (error) {
      console.error('Error getting config:', error);
      return c.json({ error: 'Config service unavailable' }, 503);
    }
  });
  
  return app;
}
```

### Workspace Services

```typescript
app.get('/workspaces/:workspaceId/streaming/status', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  
  try {
    // Get session coordinator for this workspace (creates all dependencies if needed)
    const coordinator = registry.getWorkspaceService<SessionCoordinatorAdapter>(
      workspaceId,
      'session-coordinator'
    );
    
    if (!coordinator) {
      return c.json({ error: 'Session service unavailable' }, 503);
    }
    
    // Use the service...
    return c.json(coordinator.getStatus());
  } catch (error) {
    console.error(`Error accessing session coordinator for ${workspaceId}:`, error);
    return c.json({ error: 'Failed to access session service' }, 500);
  }
});
```

## Implementation Details

### EnhancedServiceRegistry Interface

```typescript
export interface EnhancedServiceRegistry extends ServiceRegistry {
  // Register a factory for a global service
  registerServiceFactory<T extends ManagedService>(
    type: string,
    factory: () => T,
    options?: ServiceOptions
  ): void;
  
  // Register a factory for a specific workspace service
  registerWorkspaceServiceFactory<T extends ManagedService>(
    workspaceId: string,
    type: string,
    factory: () => T,
    options?: ServiceOptions
  ): void;
  
  // Register a factory function that works with any workspace ID
  registerWorkspaceFactoryFunction<T extends ManagedService>(
    type: string,
    factoryFn: (workspaceId: string) => T,
    options?: ServiceOptions
  ): void;
  
  // Register all standard services in one call
  registerStandardServices(home: string, logger?: Logger): void;
}
```

### Service Factory Implementation

The Enhanced ServiceRegistry uses maps to store factories:

```typescript
// For global service factories
private serviceFactories = new Map<string, () => ManagedService>();

// For workspace-specific service factories (by workspace)
private workspaceServiceFactories = new Map<string, Map<string, () => ManagedService>>();

// For dynamic workspace factory functions (apply to any workspace)
private workspaceFactoryFunctions = new Map<string, (workspaceId: string) => ManagedService>();
```

When a service is requested, it checks these maps in order:

1. Check if the service already exists
2. For workspace services, check if there's a specific factory for this workspace
3. If not, check if there's a generic factory function for this service type
4. Create the service using the factory and register it for future access

## How It Works

1. **Factory Registration**: Instead of creating and registering concrete service instances, you register factories that know how to create services
2. **On-Demand Creation**: When a service is requested via `getService()` or `getWorkspaceService()`, the registry checks if it already exists
3. **Lazy Initialization**: If not found, it looks for a registered factory and uses it to create the service
4. **Automatic Registration**: The newly created service is registered with the registry for future access
5. **Non-blocking Initialization**: Services are initialized asynchronously without blocking the request
6. **Dynamic Creation**: Workspace services can be created for any workspace ID on-demand

## Standard Services

The `registerStandardServices` method automatically registers factories for all common Mandrake services:

### System Services
- `mandrake-manager`: The main configuration and workspace manager
- `mcp-manager`: System-level MCP manager for tools

### Workspace Services (per workspace)
- `workspace-manager`: Workspace-specific manager
- `mcp-manager`: Workspace-specific MCP manager
- `session-coordinator`: Session streaming and coordination

## Route Pattern

To use the enhanced registry in routes:

1. Define helper functions at the top of your route handler:

```typescript
const getWorkspaceManager = (workspaceId: string) => {
  const adapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
    workspaceId, 
    'workspace-manager'
  );
  
  if (!adapter) {
    throw new Error(`Workspace manager for ${workspaceId} not found`);
  }
  
  return adapter.getManager();
};
```

2. Use try/catch blocks in route handlers:

```typescript
app.get('/endpoint', async (c) => {
  try {
    const workspaceId = c.req.param('workspaceId');
    const workspace = getWorkspaceManager(workspaceId);
    
    // Use the service...
    return c.json(await workspace.config.getConfig());
  } catch (error) {
    console.error('Error handling request:', error);
    return c.json({ error: 'Service unavailable' }, 503);
  }
});
```

3. Add fallback routes for service unavailability:

```typescript
try {
  // Set up routes that depend on a service
} catch (error) {
  console.error('Error setting up routes:', error);
  app.get('/endpoint', (c) => {
    return c.json({ error: 'Service unavailable' }, 503);
  });
}
```

## Advantages

1. **Simplified Code**: Route handlers just request the services they need without worrying about creation
2. **Resource Efficiency**: Only services that are actually used get created and initialized
3. **Dependency Management**: Dependencies are automatically resolved when a service is requested
4. **Consistent Initialization**: All services are created and registered consistently
5. **Cleaner Startup**: Application entry point is much simpler without manual service creation
6. **Streamlined Workspace Handling**: New workspaces are automatically supported without explicit registration
7. **Resilient Applications**: Routes can gracefully handle service unavailability 
8. **Future Extensions**: New service types can be added without modifying existing code

## Example

See `src/routes/example-enhanced.ts` for complete examples of using the enhanced registry in routes.

## Migrating from MandrakeManager

If you've been using MandrakeManager directly to access services, migrate by:

1. Accept a `ServiceRegistryImpl` in your route handlers instead of individual managers
2. Use `registry.getService<T>('service-type')` instead of direct manager access
3. For workspace services, use `registry.getWorkspaceService<T>(workspaceId, 'service-type')`
4. Get the underlying manager with `adapter.getManager()` when needed

```typescript
// Before
export function myRoute(mandrakeManager: MandrakeManager): Hono {
  // ...
  app.get('/endpoint', (c) => {
    const config = mandrakeManager.config.getConfig();
    return c.json({ config });
  });
}

// After
export function myRoute(registry: ServiceRegistryImpl): Hono {
  const getMandrakeManager = () => {
    const adapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!adapter) {
      throw new Error('MandrakeManager service not available');
    }
    return adapter.getManager();
  };
  
  // ...
  app.get('/endpoint', (c) => {
    try {
      const mandrakeManager = getMandrakeManager();
      const config = mandrakeManager.config.getConfig();
      return c.json({ config });
    } catch (error) {
      console.error('Error accessing config:', error);
      return c.json({ error: 'Service unavailable' }, 503);
    }
  });
}
```

## Error Handling

The enhanced registry approach includes proper error handling:

1. Service factories can throw errors during creation
2. Route handlers should catch errors and return appropriate responses
3. The registry logs errors when services fail to initialize
4. For services that fail to create, the registry returns null
5. Routes handle null services gracefully with proper error responses

## Testing Considerations

When testing with the enhanced registry:

1. Make tests resilient to service initialization failures
2. Use try/catch blocks when accessing services
3. Provide fallback responses for missing services
4. Focus tests on API behavior rather than specific service implementations