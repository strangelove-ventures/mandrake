# Mandrake

Mandrake is a CLI-first AI development assistant with deep git integration, designed for secure operations and extensible tool capabilities. It provides context-aware LLM interactions within isolated workspaces, with automatic version control and audit trails.

## Features

- **CLI-First Interface**: Terminal-based interaction optimized for developer workflows
- **Git Integration**: Automatic branching, commits, and checkpoint system for all changes
- **Workspace Isolation**: Secure project environments with `.ws` folder isolation from LLM
- **Tool Integration**: Filesystem operations, git commands, and custom tools via MCP protocol  
- **Dynamic Context**: Auto-refresh project information like directory trees and git status
- **Multi-Provider Support**: Work with various LLM providers (Anthropic, Ollama, XAI)
- **Session Management**: Track conversations with structured round/turn model
- **Security Features**: Command approval workflows and audit logging

## Installation

```bash
# Clone the repository
git clone https://github.com/strangelove-ventures/mandrake.git
cd mandrake

# Install dependencies
bun install

# Build all packages
bun run build

# Link CLI globally (coming soon)
bun link
```

## Architecture

Mandrake is organized as a monorepo with these core packages:

- **workspace**: Core project configuration and state management
- **provider**: LLM provider integration (Anthropic, Ollama)  
- **mcp**: Model Context Protocol server management  
- **session**: Conversation orchestration and prompt building
- **utils**: Shared utilities and type definitions
- **workspace**: Project configuration and state management
- **session**: Conversation orchestration and context building
- **mcp**: Model Context Protocol server management for tools
- **provider**: LLM provider integration (Anthropic, Ollama, XAI)
- **utils**: Shared utilities, logging, and type definitions

## Quick Start

```typescript
import { MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';

// Initialize Mandrake
const manager = new MandrakeManager('~/.mandrake');
await manager.init();

// Create a workspace
const workspace = await manager.createWorkspace('my-project', 'Project description');

// Configure model
await workspace.models.addProvider('anthropic', {
  type: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});
await workspace.models.setActive('claude-3-5-sonnet-20241022');

// Start tool servers (example with Docker-based filesystem server)
// Start MCP tools
const mcpManager = new MCPManager();
await mcpManager.startServer('filesystem', {
  command: 'docker',
await mcpManager.startServer('filesystem', {
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    '--mount',
    `type=bind,src=${workspace.paths.root},dst=/workspace`,
    'mcp/filesystem',
    '/workspace'
    'run', '--rm', '-i',
    '--mount', `type=bind,src=${workspace.paths.root},dst=/workspace`,
    'mcp/filesystem', '/workspace'
  ]
});

// Create session coordinator
const coordinator = new SessionCoordinator({
  metadata: {
    name: workspace.name,
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
  title: 'Development Session'
});

// Stream a response
const { stream } = await coordinator.streamRequest(
  session.id,
  'Help me create a TypeScript CLI application'
);

for await (const turn of stream) {
  console.log(turn.content);
}
```

## Configuration

Mandrake stores configuration in `~/.mandrake`:

```sh
~/.mandrake/
├── mandrake.json       # Global settings and workspace registry
├── tools.json          # Global tool configurations
├── models.json         # Global model configurations  
├── prompt.json         # Global prompt template
├── mandrake.db         # Global session database
└── workspaces/         # Individual workspace directories
    └── my-project/
        └── .ws/        # Workspace data (isolated from LLM)
            ├── config/ # Workspace configurations
            ├── files/  # Context files
            └── session.db # Conversation history
```

## Development

```bash
# Build all packages
bun run build

# Run tests
bun test

# Watch mode for development
bun run dev
```

## Security

- **Workspace Isolation**: `.ws` directories are never exposed to LLMs
- **Command Approval**: High-risk operations require explicit user confirmation
- **Git Audit Trail**: All changes tracked through git commits
- **Secrets Management**: Credentials stored securely, never in git

## Roadmap

- [ ] CLI implementation with REPL and TUI modes
- [ ] Enhanced git integration with PR automation
- [ ] Native TypeScript tools to replace Docker-based MCP servers
- [ ] Provider plugin system for easier extension
- [ ] Advanced security features and sandboxing

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.
