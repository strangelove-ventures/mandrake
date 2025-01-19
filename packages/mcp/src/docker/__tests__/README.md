# MCP Server Tests

This package provides a flexible testing framework for MCP (Model Context Protocol) servers. It supports both individual server testing and multi-server integration testing.

## Directory Structure

```shell
mcp/src/docker/__tests__/
├── configurations/        # Individual server configurations
│   ├── {server}.ts        # Implementation for the individual server
│   ├── types.ts           # Types for the configurations
│   └── index.ts           # Exports all server configs
├── multi-server.test.ts   # Multi server test runner
├── single-server.test.ts  # Single server test runner
└── test-utils.ts          # Test utilities
```

## Server Configurations

Each server configuration follows a standard structure defining:

- Server configuration (Docker settings, commands, volumes)
- Lifecycle hooks (setup, cleanup)
- Validation logic

Example configuration:

```typescript
export const myServerConfig: ServerTestConfig = {
    id: 'myserver',
    serverConfig: {
        id: 'myserver',
        name: `myserver-test-${Date.now()}`,
        image: 'mandrake-test/mcp-myserver:latest',
        command: [],
        execCommand: ['mcp-server-myserver']
    },
    hooks: {
        beforeAll: async () => {
            // Setup test directory or other resources
        },
        afterAll: async () => {
            // Cleanup
        },
        validate: async (service) => {
            // Validate server functionality
        }
    }
};
```

## Running Tests

### Single Server Test

Run a specific server test:

```bash
TEST_SERVER=memory npm run test:server
```

### Multi-Server Test

Test all servers together:

```bash
npm run test
```

## Adding New Server Tests

1. Create a new configuration file in `configurations/`
2. Add server config to `configurations/index.ts`
3. Implement required hooks and validation
4. Server will automatically be included in multi-server tests

## Test Architecture

- Each server manages its own test directory and resources
- Lifecycle hooks handle setup and cleanup
- Validation functions verify server functionality
- Common utilities provided for test directory management
