# API Routes Update for Enhanced Registry

## Overview

This document outlines the changes made to API routes to utilize the Enhanced Service Registry.

## Key Changes

1. **System Routes (`system.ts`)**
   - Updated to retrieve SessionManager through MandrakeManager
   - Added support for SessionCoordinator access through registry
   - Implemented fallback mechanisms for backward compatibility
   - Uses helper functions for consistent service access

2. **Workspace Routes (`workspaces.ts`)**
   - Updated to retrieve SessionManager through WorkspaceManager
   - Added SessionCoordinator access with fallback support
   - Implemented proper path handling for subroutes
   - Maintains consistent error handling

3. **Service Registry Integration**
   - Added factory function registration for SessionCoordinator
   - Implemented SessionCoordinatorAdapter
   - Enhanced dependency resolution for service creation
   - Provided backward compatibility mechanisms

4. **Helper Functions**
   - Added consistently named helper functions for service access
   - Implemented error handling in helpers
   - Made helpers return specific service types

## Implementation Details

### System Routes

The system routes (`system.ts`) now access SessionManager through the MandrakeManagerAdapter:

```typescript
// Session database routes - accessing SessionManager through MandrakeManager
try {
  const mandrakeManager = getMandrakeManager();
  const sessionRouter = systemSessionDatabaseRoutes(mandrakeManager.sessions);
  app.route('/sessions', sessionRouter);
} catch (error) {
  console.error('Error setting up session routes:', error);
  app.get('/sessions', (c) => {
    return c.json({ error: 'Session service unavailable' }, 503);
  });
  app.get('/sessions/*', (c) => {
    return c.json({ error: 'Session service unavailable' }, 503);
  });
}
```

And SessionCoordinator through the registry with a fallback mechanism:

```typescript
// Session streaming routes - access SessionCoordinator via factory function
try {
  // Try to get the SessionCoordinator from the registry
  const sessionCoordinator = registry.getService('session-coordinator');
  
  if (sessionCoordinator) {
    // If we have a SessionCoordinator, set up the streaming routes
    const streamingRouter = systemSessionStreamingRoutes(sessionCoordinator);
    app.route('/streaming', streamingRouter);
  } else {
    // Fallback: Create system session coordinator on demand
    // ...fallback implementation...
  }
} catch (error) {
  // Error handling...
}
```

### Workspace Routes

The workspace routes (`workspaces.ts`) use a similar pattern for accessing SessionManager:

```typescript
// Session routes - accessing SessionManager through WorkspaceManager
workspaceRouter.all('/sessions/*', async (c) => {
  try {
    const workspaceId = c.get('workspaceId') as string;
    const workspace = getWorkspaceManager(workspaceId);
    
    // Get the sessions router for this workspace
    const sessionRouter = workspaceSessionDatabaseRoutes(workspace.sessions);
    
    // Path handling for subroutes...
  } catch (error) {
    // Error handling...
  }
});
```

And SessionCoordinator with registry access and fallback:

```typescript
// Streaming routes - access SessionCoordinator via registry or create on demand
workspaceRouter.all('/streaming/*', async (c) => {
  try {
    const workspaceId = c.get('workspaceId') as string;
    
    // First try to get the SessionCoordinator from the registry
    let coordinator;
    try {
      const sessionCoordinatorAdapter = registry.getWorkspaceService(
        workspaceId,
        'session-coordinator'
      );
      
      if (sessionCoordinatorAdapter) {
        coordinator = sessionCoordinatorAdapter;
      }
    } catch (error) {
      // Fallback logging...
    }
    
    // Fallback: Create coordinator directly if it's not in the registry
    if (!coordinator) {
      // Create with available managers...
    }
    
    // Set up streaming routes...
  } catch (error) {
    // Error handling...
  }
});
```

### Factory Functions

Factory functions for SessionCoordinator have been implemented in `factories.ts`:

```typescript
// Register SessionCoordinator factory function for system
registry.registerServiceFactory('session-coordinator', async (registry) => {
  // Get dependencies from registry
  const mandrakeAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
  const mcpAdapter = registry.getService<MCPManagerAdapter>('mcp-manager');
  
  // Create and return coordinator adapter
  const coordinator = new SessionCoordinator({
    // Configure with dependencies...
  });
  
  return new SessionCoordinatorAdapter(coordinator, {
    logger: new ConsoleLogger({ meta: { service: 'SessionCoordinatorAdapter' } })
  });
}, { dependencies: ['mandrake-manager', 'mcp-manager'] });
```

And similarly for workspace SessionCoordinators:

```typescript
// Register SessionCoordinator factory function for workspaces
registry.registerWorkspaceFactoryFunction('session-coordinator', async (registry, workspaceId) => {
  // Get workspace manager and other dependencies
  const wsAdapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
    workspaceId,
    'workspace-manager'
  );
  
  // Create with workspace-specific dependencies...
  
  return new SessionCoordinatorAdapter(coordinator, {
    logger: new ConsoleLogger({ 
      meta: { service: 'SessionCoordinatorAdapter', workspaceId }
    })
  });
}, { dependencies: ['workspace-manager', 'mcp-manager'] });
```

## Testing and Considerations

When testing these changes:

1. **Compatibility**: Ensure backward compatibility with existing routes
2. **Error Handling**: Verify proper error handling for service unavailability
3. **Lazy Loading**: Test lazy loading of services through factory functions
4. **Performance**: Monitor any performance impacts from registry access

## Future Improvements

Potential future improvements:

1. **Caching**: Add service result caching for frequently accessed services
2. **Resource Limits**: Implement limits on number of concurrent services
3. **Service Status Dashboard**: Create a dashboard for service status monitoring
4. **Metrics**: Add detailed metrics collection for service usage and performance