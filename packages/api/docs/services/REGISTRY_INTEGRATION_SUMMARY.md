# Enhanced Service Registry Integration Summary

This document summarizes how the enhanced service registry integrates with key services in the Mandrake API.

## Core Benefits of Enhanced Registry

1. **Lazy Initialization**:
   - Services are only created and initialized when they're first requested
   - Reduces startup time and resource usage
   - Enables on-demand loading of workspace-specific services

2. **Dependency Resolution**:
   - Automatically resolves and initializes service dependencies
   - Ensures services are initialized in the correct order
   - Prevents circular dependencies through topological sorting

3. **Lifecycle Management**:
   - Standardized service initialization and cleanup
   - Proper resource release during application shutdown
   - Consistent error handling during service lifecycle

4. **Service Factory Functions**:
   - Enables dynamic service creation through factory functions
   - Supports both global and workspace-specific factories
   - Reduces manual boilerplate for service creation

## Integration with Key Services

### MandrakeManager

```typescript
// Register the MandrakeManager service
registry.registerService('mandrakeManager', mandrakeManager);

// Access the service when needed
const mandrakeManager = await registry.getService('mandrakeManager');
```

Benefits:
- Coordinated initialization with dependent services
- Proper cleanup of all system-level resources
- Easier access pattern through registry

### WorkspaceManager

```typescript
// Register existing workspace managers
for (const [id, workspace] of workspaces.entries()) {
  registry.registerWorkspaceService(id, 'workspaceManager', workspace);
}

// Register factory function for dynamic workspace creation
registry.registerWorkspaceFactoryFunction('workspaceManager', async (registry, workspaceId) => {
  const mandrakeManager = await registry.getService('mandrakeManager');
  const workspaceData = await mandrakeManager.getWorkspace(workspaceId);
  
  const workspace = new WorkspaceManager(
    workspaceData.path,
    workspaceData.name,
    workspaceData.id
  );
  
  await workspace.init(workspaceData.description);
  return workspace;
});

// Access a workspace manager
const workspace = await registry.getWorkspaceService(workspaceId, 'workspaceManager');
```

Benefits:
- Lazy loading of workspaces only when needed
- Automatic workspace creation if not already registered
- Proper cleanup of workspace resources

### MCPManager

```typescript
// Register system MCP manager
registry.registerService('mcpManager', systemMcpManager);

// Register workspace-specific MCP managers
registry.registerWorkspaceService(workspaceId, 'mcpManager', workspaceMcpManager);

// Access MCP managers
const mcpManager = await registry.getService('mcpManager');
const wsMcpManager = await registry.getWorkspaceService(workspaceId, 'mcpManager');
```

Benefits:
- Proper cleanup of child processes during shutdown
- Health monitoring and status reporting
- Consolidated management of all MCP instances

### SessionManager

```typescript
// Register factory function for system SessionManager
registry.registerServiceFactory('sessionManager', async (registry) => {
  const mandrakeManager = await registry.getService('mandrakeManager');
  return mandrakeManager.sessions;
});

// Register factory function for workspace SessionManagers
registry.registerWorkspaceFactoryFunction('sessionManager', async (registry, workspaceId) => {
  const workspace = await registry.getWorkspaceService(workspaceId, 'workspaceManager');
  return workspace.sessions;
});

// Access session managers
const sessionManager = await registry.getService('sessionManager');
const wsSessionManager = await registry.getWorkspaceService(workspaceId, 'sessionManager');
```

Benefits:
- Consistent access to session managers
- Proper database connection management
- Automatic dependency resolution

### SessionCoordinator

```typescript
// Register factory function for creating SessionCoordinators
registry.registerServiceFactory('sessionCoordinator', async (registry) => {
  // Get dependencies from the registry
  const sessionManager = await registry.getService('sessionManager');
  const promptManager = await registry.getService('promptManager');
  const mcpManager = await registry.getService('mcpManager');
  const modelsManager = await registry.getService('modelsManager');
  
  return new SessionCoordinator({
    metadata: { name: 'system', path: rootPath },
    sessionManager,
    promptManager,
    mcpManager,
    modelsManager
  });
});

// Register factory function for workspace-specific coordinators
registry.registerWorkspaceFactoryFunction('sessionCoordinator', async (registry, workspaceId) => {
  // Get workspace-specific dependencies
  const workspace = await registry.getWorkspaceService(workspaceId, 'workspaceManager');
  const mcpManager = await registry.getWorkspaceService(workspaceId, 'mcpManager');
  
  return new SessionCoordinator({
    metadata: { name: workspace.name, path: workspace.paths.root },
    sessionManager: workspace.sessions,
    promptManager: workspace.prompt,
    mcpManager,
    modelsManager: workspace.models,
    filesManager: workspace.files,
    dynamicContextManager: workspace.dynamic
  });
});

// Access coordinators
const sessionCoordinator = await registry.getService('sessionCoordinator');
const wsSessionCoordinator = await registry.getWorkspaceService(workspaceId, 'sessionCoordinator');
```

Benefits:
- On-demand creation of coordinators
- Automatic dependency resolution
- Proper resource cleanup
- Reduced memory usage for inactive sessions

## Updating API Routes

The API routes can be updated to use the enhanced registry:

```typescript
// Before: Direct access to managers
app.get('/status', (c) => {
  const status = managers.mandrakeManager.getStatus();
  return c.json(status);
});

// After: Access through registry
app.get('/status', async (c) => {
  const mandrakeManager = await c.get('registry').getService('mandrakeManager');
  const status = mandrakeManager.getStatus();
  return c.json(status);
});

// Before: Workspace access through middleware
app.use('/workspaces/:workspaceId/*', createWorkspaceMiddleware(accessors));

// After: Async middleware with registry
app.use('/workspaces/:workspaceId/*', async (c, next) => {
  const workspaceId = c.req.param('workspaceId');
  try {
    const workspace = await c.get('registry').getWorkspaceService(workspaceId, 'workspaceManager');
    c.set('workspace', workspace);
    c.set('workspaceId', workspaceId);
    await next();
  } catch (error) {
    return c.json({ error: 'Workspace not found' }, 404);
  }
});
```

## Helper Functions

Helper functions can be created to simplify service access:

```typescript
// Get MandrakeManager from registry
async function getMandrakeManager(c: Context): Promise<MandrakeManager> {
  const manager = await c.get('registry').getService('mandrakeManager');
  if (!manager) {
    throw new Error('MandrakeManager not available');
  }
  return manager;
}

// Get WorkspaceManager from registry
async function getWorkspaceManager(c: Context, workspaceId: string): Promise<WorkspaceManager> {
  const workspace = await c.get('registry').getWorkspaceService(workspaceId, 'workspaceManager');
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }
  return workspace;
}

// Usage in routes
app.get('/config', async (c) => {
  const mandrake = await getMandrakeManager(c);
  const config = await mandrake.config.getConfig();
  return c.json(config);
});
```

## Graceful Shutdown

The enhanced registry enables proper cleanup during application shutdown:

```typescript
// Initialize the registry
const registry = new ServiceRegistryImpl();

// Register shutdown handler
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  try {
    // Clean up all services in the correct order
    await registry.cleanupServices();
    console.log('All services cleaned up successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
});
```

## Conclusion

The enhanced service registry provides a centralized, consistent approach to service management throughout the Mandrake API. By standardizing service lifecycle management, enabling dependency resolution, and supporting lazy initialization, it improves application resilience, startup performance, and resource utilization.