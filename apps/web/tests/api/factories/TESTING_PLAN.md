# Route Factories Testing Plan

This document outlines the approach for testing the API route factories in Mandrake.

## Testing Approach

We will test the route factories directly without mocking the underlying managers. This means:

1. Tests will use real manager instances
2. Tests will interact with real file systems
3. Tests will ensure proper error handling and validation

## Test Structure

For each route factory, we'll create a test file with the following structure:

```typescript
describe('Route Factory Name', () => {
  // Setup and teardown
  
  describe('HTTP Method (GET/POST/PUT/DELETE)', () => {
    // Success cases - test happy paths
    
    // Error cases - test validation failures, not found, etc.
  });
});
```

## Test Files to Create

1. **Workspaces Routes**
   - `createWorkspacesRoutes.test.ts`
   - Test system-level workspace management

2. **Dynamic Context Routes**
   - `createDynamicContextRoutes.test.ts`
   - Test workspace-scoped dynamic context management

3. **Models Routes**
   - `createModelRoutes.test.ts` 
   - Test both system and workspace-scoped model management

4. **Prompt Routes**
   - `createPromptRoutes.test.ts`
   - Test both system and workspace-scoped prompt configuration

5. **Files Routes**
   - `createFilesRoutes.test.ts`
   - Test workspace-scoped file management

6. **Session Routes**
   - `createSessionRoutes.test.ts`
   - Test both system and workspace-scoped session management
   - Include streaming functionality

7. **Tools Routes**
   - `createToolsRoutes.test.ts`
   - Test tools configuration management
   - Test MCP server interactions
   - Test method execution

## Implementation Plan

1. Start with `createWorkspacesRoutes.test.ts` as it's foundational
2. Next implement `createToolsRoutes.test.ts` as it's the most complex
3. Continue with other resource routes
4. Ensure tests cover both success and error cases

## Testing Utilities

Create shared test utilities for:

1. Setting up test environments
2. Creating test workspaces
3. Validating response formats
4. Cleaning up test resources

## Dependencies

Tests will need:

1. A test directory for Mandrake data
2. Example files for testing file operations
3. Test tool servers for testing MCP functionality
