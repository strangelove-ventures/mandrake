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

## Getting Started

1. Build the test images:

```bash
# From the mcp package directory
npm run build:test-servers
```

This builds all required Docker images. If tests fail with container not found errors, try rebuilding the images first.

1. Run tests:

```bash
# Test a single server
TEST_SERVER=memory npm run test:server

# Test all servers together
npm run test:servers
```

Available servers for single testing:

- memory
- git
- filesystem
- fetch

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

## Adding New Server Tests

1. Create a new configuration file in `configurations/`
2. Implement required hooks and validation
3. Add server config to `configurations/index.ts`
4. Run single server test while debugging
5. Server will automatically be included in multi-server tests

## Test Architecture

- Each server manages its own test directory and resources
- Lifecycle hooks handle setup and cleanup
- Validation functions verify server functionality
- Common utilities provided for test directory management
