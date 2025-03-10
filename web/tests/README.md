# Mandrake Web Client Tests

This directory contains tests for the Mandrake web client.

## Testing Philosophy

Our testing approach follows these principles:

1. **No mocking**: We avoid mocks/stubs and test real implementations
2. **Simple and direct**: Tests should be straightforward and easy to understand
3. **Test public behavior**: Focus on testing the public API of components

## API Client Tests

The API client tests are divided into two categories:

1. **Structure Tests**: Testing the structure and exports of the API client
2. **Integration Tests**: Testing actual API functionality against a real API server

### Test Organization

- `tests/lib/api/`: Tests for API client structure
  - `client.test.ts`: Tests for the ApiClient class behavior
  - `errors.test.ts`: Tests for error handling
  - `index.test.ts`: Tests for the API structure and exports
- `tests/lib/api/resources/`: Functional tests for API resources
  - `workspaces.test.ts`: Tests for workspace operations
  - `sessions.test.ts`: Tests for session operations
  - `system.test.ts`: Tests for system operations

### Running Structure Tests

These tests validate the API client structure and behavior without making actual API calls:

```bash
# Run all structure tests
bun test tests/lib/api/

# Run specific test files
bun test tests/lib/api/client.test.ts
```

### Running Integration Tests

These tests make actual API calls to validate functionality against a real API server:

```bash
# Run all integration tests (handles API server startup automatically)
bun run test:api

# Run a specific integration test file (requires API server running separately)
API_TEST_MODE=integration API_BASE_URL=http://localhost:4000 bun test tests/lib/api/resources/workspaces.test.ts
```

The `test:api` command will:
1. Create a temporary directory for the Mandrake home
2. Start the API server on a random available port
3. Run the integration tests against that server
4. Shut down the server and clean up temporary files

This approach ensures clean testing without affecting your local setup.

> **Note**: When running tests with `bun test` directly, integration tests will be skipped by default unless you set `API_TEST_MODE=integration`.

## Adding New Tests

When adding tests, follow these guidelines:

1. For structure tests:
   - Test real implementations, not mocks
   - Keep tests simple and focused on a single behavior

2. For integration tests:
   - Add cleanup code to avoid leaving test data
   - Use unique identifiers to avoid conflicts
   - Make tests handle failures gracefully
   - Use the `integrationTest` helper to conditionally run tests