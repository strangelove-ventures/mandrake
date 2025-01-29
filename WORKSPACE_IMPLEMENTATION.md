# Workspace Implementation Plan

## Directory Structure

```shell
~/.mandrake/
├── workspaces/
│   ├── my-project/              # Human readable name, no spaces
│   │   ├── config/
│   │   │   ├── system-prompt.md # Base system prompt
│   │   │   ├── models.json      # Model connection settings
│   │   │   ├── tools.json       # MCP server configurations
│   │   │   └── context.json     # Context refresh policies
│   │   ├── context/            
│   │   │   └── files/          # User's static context files
│   │   ├── src/                # Source code (.git included)
│   │   └── workspace.json      # Basic workspace metadata
```

## Configuration Files

### workspace.json

```json
{
  "id": "uuid-from-db",
  "name": "my-project",
  "description": "Optional project description",
  "created": "ISO timestamp",
  "backup": {
    "lastBackup": "ISO timestamp",
    "location": "backup path"
  }
}
```

### config/models.json

```json
{
  "provider": "anthropic",
  "apiKey": "key",
  "baseURL": "optional override",
  "maxTokens": 16000,
  "temperature": 0.7
}
```

### config/tools.json

```json
{
  "servers": [
    {
      "id": "filesystem",
      "name": "filesystem-{timestamp}",
      "image": "mandrake/mcp-filesystem:latest",
      "command": ["/workspace"],
      "execCommand": ["/app/dist/index.js", "/workspace"],
      "volumes": [{
        "source": "{workspacePath}",
        "target": "/workspace",
        "mode": "rw"
      }]
    },
    {
      "id": "git",
      "name": "git-{timestamp}", 
      "image": "mandrake/mcp-git:latest",
      "execCommand": ["mcp-server-git"],
      "volumes": [{
        "source": "{workspacePath}",
        "target": "/workspace",
        "mode": "rw"
      }]
    },
    {
      "id": "fetch",
      "name": "fetch-{timestamp}",
      "image": "mandrake/mcp-fetch:latest",
      "execCommand": ["mcp-server-fetch"]
    }
  ]
}
```

### config/context.json

```json
{
  "refresh": {
    "git": {
      "enabled": true,
      "interval": "1h"
    },
    "filesystem": {
      "enabled": true,
      "onDemand": true
    }
  }
}
```

## Implementation Phases

### Phase 1: Core Structure

1. Create workspace management CLI commands
   - Initialize workspace structure
   - Validate configurations
   - Generate workspace.json with DB linkage

2. Build basic frontend for workspace management
   - List workspaces from ~/.mandrake
   - Create new workspace with name validation
   - Show workspace details and configs

### Phase 2: Tool Integration

1. Implement MCP server management
   - Start/stop containers based on tools.json
   - Mount workspace directory appropriately
   - Handle container health checks

2. Add tool configuration UI
   - Edit tools.json through frontend
   - Show tool status and logs
   - Manual refresh triggers

### Phase 3: Context Management

1. Build context file browser
   - Show files in context/files
   - Token count estimation
   - File type support indicators

2. Implement context refresh system
   - Execute tool refreshes based on policies
   - Update context based on tool outputs
   - Show loading states during updates

## Database Integration

### Minimal Workspace Schema

```prisma
model Workspace {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  sessions    Session[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

- Database only stores workspace reference
- All configuration lives in filesystem
- Sessions link to workspace via ID
- Name must match filesystem folder name

## Frontend Considerations

1. Workspace Management
   - List view with cards showing name/description
   - Basic metadata from workspace.json
   - Create/rename/delete operations

2. Context Visualization
   - File browser for context/files
   - Token usage indicators
   - Unsupported file type warnings
   - No explicit file size limits, but visual indicators

3. Tool Management
   - Simple text editor for tools.json initially
   - Tool status indicators
   - Manual refresh triggers
   - Container logs viewer

## Next Steps

1. Create filesystem utility functions for workspace management
2. Build basic frontend components for workspace listing
3. Implement workspace creation flow
4. Add configuration editors
5. Begin tool container management implementation
