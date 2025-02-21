# Workspace Tools

MCP server implementation that provides tools for managing Mandrake workspaces through natural language commands.

## Features

- Dynamic context management
- File management 
- Model configuration
- System prompt management

## Usage

```typescript
import { WorkspaceToolServer } from '@mandrake/workspace-tools';
import { WorkspaceManager } from '@mandrake/workspace';

// Create workspace and server
const workspace = new WorkspaceManager('/path/to/workspace');
const server = new WorkspaceToolServer(workspace);

// Start server
await server.start();

// Execute tool commands
await server.execute('manage_files', {
  action: 'add',
  path: 'requirements.txt',
  content: 'requests==2.31.0\npandas==2.1.4'
});

await server.execute('manage_models', {
  action: 'add',
  provider: 'anthropic',
  model: 'claude-3-opus',
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Stop server
await server.stop();
```

## Available Tools

### Dynamic Context Management
- Add/remove/update dynamic context entries
- Enable/disable context items
- List all configured contexts

```typescript
await server.execute('manage_dynamic_context', {
  action: 'add',
  name: 'git-status',
  command: 'git status',
  enabled: true
});
```

### File Management
- Create/read/update/delete files
- List workspace files
- Handle nested directories

```typescript
await server.execute('manage_files', {
  action: 'add',
  path: 'docs/api.md',
  content: '# API Documentation\n...'
});
```

### Model Configuration
- Configure model providers
- Enable/disable models
- Manage API keys securely

```typescript
await server.execute('manage_models', {
  action: 'enable',
  provider: 'anthropic',
  model: 'claude-3-opus'
});
```

### System Prompt Management
- Get/update workspace system prompts
- Maintain workspace-specific configurations

```typescript
await server.execute('manage_prompt', {
  action: 'update',
  prompt: 'You are a helpful assistant working on {workspace}...'
});
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build package
bun run build
```