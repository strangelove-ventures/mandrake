# Mandrake MCP Package

This package provides a Docker-based implementation of the Model Context Protocol (MCP) service system. It handles container lifecycle management, communication, and integration for MCP servers.

## Features

- Docker-based MCP server management
- Structured logging with Winston
- Built-in transport layer for server communication
- Comprehensive testing framework

## Architecture

The package is organized into several key components:

### Docker Management

- `DockerMCPService`: Main service class managing multiple MCP servers
- `DockerMCPServer`: Individual server instance management
- `DockerTransport`: Transport layer for server communication

### Logging

The package uses a hierarchical logging system with the following structure:

```typescript
mandrake
└── mcp
    └── docker
        ├── server:<server-id>
        │   └── transport
        └── service
```

Log levels can be controlled via the `LOG_LEVEL` environment variable:

- ERROR: Only show errors
- INFO: Show important operational info (default)
- DEBUG: Show detailed debug information

## Usage

```typescript
import { DockerMCPService } from '@mandrake/mcp';

const service = new DockerMCPService();

// Initialize servers
await service.initialize([
    {
        id: 'memory',
        name: 'memory-server',
        image: 'mandrake-test/mcp-memory:latest',
        command: ['node', '/app/dist/index.js'],
        execCommand: ['node', '/app/dist/index.js']
    }
]);

// Get server instance
const server = service.getServer('memory');

// Invoke tool
const result = await server.invokeTool('read_graph', {});

// Cleanup
await service.cleanup();
```

## Testing

The package includes a comprehensive testing framework for MCP servers. See the [Test Framework Documentation](src/docker/__tests__/README.md) for details on:

- Running individual server tests
- Multi-server integration testing
- Adding new server tests

## Development

### Prerequisites

- Node.js 16+
- Docker
- TypeScript 5+

### Setup

```bash
npm install
```

### Building

```bash
npm run build
```

### Environment Variables

- `LOG_LEVEL`: Controls logging verbosity (error, info, debug)
- `NODE_OPTIONS`: VM and runtime options
