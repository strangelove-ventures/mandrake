# Mandrake

Mandrake is an extensible AI agent platform built for developers, enabling context-aware LLM interactions within isolated workspaces. It provides advanced tool integration, dynamic context refreshing, and structured conversation management.

## Features

- **Workspace Management**: Isolate projects with dedicated configuration, files, and tools
- **Tool Integration**: Run filesystem operations, git commands, and custom tools via MCP protocol
- **Dynamic Context**: Auto-refresh project information like directory trees and git status
- **Cross-Provider Support**: Work with various LLM providers (Anthropic, Ollama)
- **Session Management**: Track conversations with structured round/turn model
- **Extensible Architecture**: Add custom tools, providers, and workspace features

## Installation

```bash
# Clone the repository
git clone https://github.com/strangelove-ventures/mandrake-new.git
cd mandrake-new

# Install dependencies
bun install

# Build all packages
bun run build
```

## Packages

Mandrake is organized as a monorepo with these key packages:

- **workspace**: Core project configuration and state management
- **provider**: LLM provider integration (Anthropic, Ollama)
- **mcp**: Model Context Protocol server management  
- **ripper**: Filesystem and command execution tool server
- **session**: Conversation orchestration and prompt building
- **utils**: Shared utilities and type definitions

## Quick Start

```typescript
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';

// Initialize workspace
const workspace = new WorkspaceManager('~/.mandrake/workspaces', 'my-project');
await workspace.init('My development workspace');

// Configure model
await workspace.models.addProvider('anthropic', {
  type: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});
await workspace.models.setActive('claude-3-5-sonnet-20241022');

// Start tool servers
const mcpManager = new MCPManager();
await mcpManager.startServer('ripper', {
  command: 'bun',
  args: [
    'run',
    '../ripper/dist/server.js',
    '--transport=stdio',
    `--workspaceDir=${workspace.paths.root}`,
    '--excludePatterns=\\.ws'
  ]
});

// Create session coordinator
const coordinator = new SessionCoordinator({
  metadata: {
    name: 'my-project',
    path: workspace.paths.root
  },
  promptManager: workspace.prompt,
  sessionManager: workspace.sessions,
  mcpManager,
  modelsManager: workspace.models,
  filesManager: workspace.files,
  dynamicContextManager: workspace.dynamic
});

// Create a session
const session = await workspace.sessions.createSession({
  title: 'Project Planning Session'
});

// Handle user request
await coordinator.handleRequest(
  session.id,
  'Help me structure a Node.js API with TypeScript'
);
```

## Development

```bash
# Build all packages
bun run build

# Run tests
bun test

# Start the web application
cd apps/web
bun run dev
```

## Configuration

Mandrake stores its configuration in the `~/.mandrake` directory:

```sh
~/.mandrake/
├── mandrake.db         # Application-level database
├── mandrake.json       # Global configuration
└── workspaces/         # Individual workspaces
    └── my-project/     # A workspace
        ├── .ws/        # Workspace metadata and configuration
        └── src/        # Source code
```
