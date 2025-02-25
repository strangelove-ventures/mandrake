# Ripper

## Overview

Ripper is Mandrake's core filesystem and command execution tool server. Built on the Model Context Protocol (MCP) framework, it provides a secure, containerized system for AI assistants to interact with local files and execute commands. Named after Brigadier General Jack D. Ripper from Dr. Strangelove, it pairs with Mandrake to provide essential workspace functionality.

## Core Concepts

### Security Context

All operations in Ripper are governed by a security context that specifies:

- `allowedDirs`: An array of directories that tools are allowed to access
- `excludePatterns`: Regular expression patterns to exclude specific files/directories

### Runtime Environment

Ripper is designed to run as a standalone Node.js process using Bun, with its main process communicating via standard input/output (stdio) or Server-Sent Events (SSE). While Docker containerization is planned for the future, the current implementation uses direct process execution.

### MCP Compatibility

Ripper implements the Model Context Protocol, making it compatible with any LLM agent that follows this protocol. The FastMCP class extends the base MCP server with additional functionality.

## Architecture

### Server

The `RipperServer` class serves as the main entry point, initializing the FastMCP server and registering tools. It handles:

- Server configuration and lifecycle
- Tool registration and management
- Transport configuration (stdio or SSE)

### Tools

Each tool is modeled as a standalone function that:

1. Accepts a security context during initialization
2. Returns a Tool object with name, description, parameters schema, and execute function
3. Operates within the security boundaries of the context

### Utilities

Shared utilities provide core functionality for:

- Path validation and normalization
- File operations with security checks
- Command execution with safety features
- Error handling and reporting

## Usage

### Running with Bun

The standard way to run Ripper in the Mandrake ecosystem is via Bun:

```typescript
// In your server configuration
const SERVER_CONFIG: ServerConfig = {
    command: 'bun',
    args: [
        'run',
        join(process.cwd(), '../ripper/dist/server.js'),
        '--transport=stdio',
        `--workspaceDir=${WORKSPACE_DIR}`,
        '--excludePatterns=\\.ws'
    ]
}
```

### Programmatic Usage

```typescript
import { RipperServer } from '@mandrake/ripper';

const server = new RipperServer({
  name: 'ripper',
  version: '1.0.0',
  transport: { transportType: 'stdio' },
  workspaceDir: '/path/to/workspace',
  excludePatterns: ['.git', 'node_modules'],
  additionalDirs: []
});

server.start().catch(console.error);
```

### CLI Options

```sh
--transport=stdio|sse   Transport mode (default: stdio)
--workspaceDir=/path    Path to workspace directory (default: /ws)
--excludePatterns=a,b   Comma-separated exclude patterns (default: .ws)
--port=3000             Port for SSE transport (required for SSE)
--endpoint=/sse         Endpoint for SSE transport (default: /sse)
```

## Key Interfaces

### RipperServerConfig

```typescript
interface RipperServerConfig {
  name: string;
  version: `${number}.${number}.${number}`;
  transport: { transportType: 'stdio' } | { 
    transportType: 'sse';
    sse: {
      endpoint: `/${string}`;
      port: number;
    }
  };
  workspaceDir: string;
  additionalDirs: string[];
  excludePatterns: string[];
}
```

### SecurityContext

```typescript
interface SecurityContext {
  allowedDirs: string[];
  excludePatterns: string[];
}
```

### Available Tools

- `read_files`: Read one or more files
- `write_file`: Create or overwrite files
- `edit_file`: Make line-based edits to text files
- `move_file`: Move or rename files and directories
- `create_directory`: Create directories recursively
- `list_directory`: List directory contents
- `tree`: Generate directory tree visualizations
- `search_files`: Search for files matching patterns
- `list_allowed_directories`: List permitted directories
- `command`: Execute shell commands securely

## Integration Points

### MCP Protocol

Any LLM agent that speaks MCP can interact with Ripper using its tool interface.

### Workspace Integration

In the Mandrake architecture, Ripper handles all filesystem operations for:

- Reading/writing workspace files
- Executing commands within workspaces
- Managing source code in the `src` directory
- Running dynamic context providers

### Security Boundaries

Ripper enforces security boundaries defined in the workspace configuration, ensuring:

- Only allowed directories can be accessed
- Commands are executed safely
- Excluded patterns are respected
