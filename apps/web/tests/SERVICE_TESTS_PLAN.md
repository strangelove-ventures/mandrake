# Service Layer Test Plan

This document outlines the testing strategy for the Mandrake service layer in the Next.js application.

## Overview

Our tests will focus on the service registry and helpers that manage workspaces, MCP servers, and session coordinators. Instead of using mocks, we'll test with actual implementations of the underlying services, similar to the integration tests in the workspace and session packages.

## Test Structure

```sh
apps/web/tests/
  ├── utils/                  # Test utilities
  │   ├── setup.ts            # Test setup helpers
  │   └── testdir.ts          # Temporary directory management for tests
  ├── services/               # Service tests
  │   ├── registry.test.ts    # Tests for the service registry
  │   ├── helpers.test.ts     # Tests for the service helper functions
  │   └── init.test.ts        # Tests for service initialization
  └── SERVICE_TESTS_PLAN.md   # This file
```

## Key Test Areas

### 1. ServiceRegistry Tests

The ServiceRegistry manages instances of WorkspaceManager, MCPManager, and SessionCoordinator. Tests will verify:

- **Instance Management**:
  - Creates and initializes new instances correctly
  - Returns cached instances when appropriate
  - Manages dependencies between different service types

- **Resource Lifecycle**:
  - Releases resources properly when requested
  - Cleans up inactive resources after timeout
  - Enforces resource limits appropriately

- **Error Handling**:
  - Gracefully handles initialization failures
  - Properly cleans up if a service fails

### 2. Helper Function Tests

The helper functions provide a simplified interface to the registry. Tests will verify:

- **Convenience Methods**:
  - Correctly initializes the registry if needed
  - Properly forwards parameters to the registry
  - Returns appropriate results

- **Error Handling**:
  - Properly handles and reports errors
  - Does not leave resources in an inconsistent state

### 3. Initialization Tests

The initialization module sets up the registry and manages cleanup. Tests will verify:

- **Setup**:
  - Properly initializes the registry
  - Sets up cleanup intervals
  - Is idempotent (can be called multiple times)

## Testing Approach

Following the patterns in the existing workspace and session tests:

1. **Use Real Dependencies**:
   - Create actual WorkspaceManager, MCPManager, and SessionCoordinator instances
   - Use temporary directories for testing
   - Set up minimal configurations needed for testing

2. **Test Full Service Lifecycle**:
   - Create, use, and clean up services
   - Test resource limits and timeout-based cleanup
   - Verify resource management works correctly

3. **Test Singleton Behavior**:
   - Verify the registry is a proper singleton
   - Test cache invalidation when resources are released
   - Verify singleton reset between tests

## Test Implementation Plan

### ServiceRegistry Tests

```typescript
// Test creation and caching of workspace managers
test('should create and cache workspace managers', async () => {
  const registry = getServiceRegistry();
  
  // Create a workspace manager
  const tempDir = await createTempDirectory();
  const manager1 = await registry.getWorkspaceManager('test', tempDir);
  
  // Request the same workspace manager again
  const manager2 = await registry.getWorkspaceManager('test', tempDir);
  
  // Should be the same instance
  expect(manager1).toBe(manager2);
  
  // Clean up
  await registry.releaseWorkspaceResources('test');
  await cleanupTempDirectory(tempDir);
});

// Test resource limits
test('should enforce session limits', async () => {
  const registry = getServiceRegistry();
  
  // Set low limit for testing (private field access for test only)
  Object.defineProperty(registry, 'maxConcurrentSessions', { value: 2 });
  
  // Create multiple sessions
  const tempDir = await createTempDirectory();
  await registry.getSessionCoordinator('test', tempDir, 'session1');
  await registry.getSessionCoordinator('test', tempDir, 'session2');
  
  // This should cause the oldest session to be released
  await registry.getSessionCoordinator('test', tempDir, 'session3');
  
  // Verify session1 was released
  const sessions = await registry.getActiveSessions();
  expect(sessions.some(s => s.id === 'session1')).toBeFalsy();
  expect(sessions.some(s => s.id === 'session2')).toBeTruthy();
  expect(sessions.some(s => s.id === 'session3')).toBeTruthy();
  
  // Clean up
  await registry.releaseWorkspaceResources('test');
  await cleanupTempDirectory(tempDir);
});
```

### Helper Function Tests

```typescript
// Test getSessionCoordinatorForRequest
test('should get session coordinator', async () => {
  const tempDir = await createTempDirectory();
  
  // Get a session coordinator
  const coordinator = await getSessionCoordinatorForRequest('test', tempDir, 'session1');
  
  // Verify it's a valid coordinator
  expect(coordinator).toBeDefined();
  
  // Clean up
  await releaseSessionResources('test', 'session1');
  await releaseWorkspaceResources('test');
  await cleanupTempDirectory(tempDir);
});
```

### Initialization Tests

```typescript
// Test initializeServices
test('should initialize services', async () => {
  // Call the init function
  await initializeServices();
  
  // Should be able to call it again without errors
  await initializeServices();
  
  // Verify it sets up the cleanup interval
  // This would require some way to check internals or mock timing
});
```

## Special Considerations

### 1. Test Isolation

- Reset the registry singleton between tests
- Use unique workspace/session names for each test
- Use unique temp directories for each test

### 2. Time-Based Testing

For testing cleanup of inactive resources:

- We may need to manipulate Date.now() to simulate passage of time
- Alternatively, we can temporarily reduce timeouts for testing

### 3. Resource Management

- Tests should properly clean up all created resources
- Use beforeEach/afterEach hooks for consistent cleanup

### 4. Long-Running Tests

- Some tests involving actual MCP servers may be slow
- Consider marking these with longer timeouts

## Test Dependencies

1. Temporary directory management functionality
2. Registry singleton reset helper
3. Time manipulation utilities for timeout testing
