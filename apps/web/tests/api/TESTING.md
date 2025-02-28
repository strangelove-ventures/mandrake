# API Testing Plan and Progress

This document outlines the testing plan for the Mandrake API routes and factories.

## Testing Approach

- **No Mocking**: We are testing with real manager instances and real file operations where possible
- **Factory Testing**: We test the route factories directly rather than the API routes
- **Coverage**: We aim to test all success and error paths for each API endpoint

## Test Structure

Each test file follows this general structure:

```typescript
describe('Route Factory Name', () => {
  // Setup and teardown
  
  describe('HTTP Method (GET/POST/PUT/DELETE)', () => {
    // Success cases
    it('should perform the expected operation', async () => {...});
    
    // Error cases
    it('should handle validation errors', async () => {...});
    it('should return 404 for missing resources', async () => {...});
  });
});
```

## Progress

| Route Factory | Test File | Status |
|---------------|-----------|--------|
| Workspaces | `createWorkspacesRoutes.test.ts` | ✅ Implemented |
| Dynamic Context | `createDynamicContextRoutes.test.ts` | 🔄 Planned |
| Models | `createModelRoutes.test.ts` | 🔄 Planned |
| Prompt | `createPromptRoutes.test.ts` | 🔄 Planned |
| Files | `createFilesRoutes.test.ts` | 🔄 Planned |
| Sessions | `createSessionRoutes.test.ts` | 🔄 Planned |
| Tools | `createToolsRoutes.test.ts` | ✅ Implemented |

## Common Patterns

### Setup

```typescript
// Create test environment
const testEnv = await createTestEnvironment();

// Mock utility functions
(getMandrakeManager as any).mockReturnValue(testEnv.mandrakeManager);
```

### Request Creation

```typescript
// Create a test request
const req = createTestRequest('GET', 'http://localhost/api/resource');

// With body
const req = createTestRequest('POST', 'http://localhost/api/resource', { data });
```

### Response Validation

```typescript
// Validate basic response properties
validateResponse(response, 200);

// Get and validate data
const data = await getResponseData(response);
expect(data.success).toBe(true);
expect(data.data).toHaveProperty('expectedProperty');
```

## Next Steps

1. Implement remaining test files
2. Add tests for concurrent operations
3. Add load/stress tests for streaming endpoints
4. Add integration tests that exercise the full API through HTTP calls

## Issues and Considerations

- **Test Data Isolation**: Ensure tests don't interfere with each other
- **Cleanup**: Always clean up test resources after tests complete
- **MCP Servers**: Testing real MCP servers requires special handling
- **Performance**: Running tests with real managers can be slower
