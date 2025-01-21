# Mandrake Data Management

This document outlines Mandrake's data management strategy, covering both database and filesystem organization. The design supports our core architectural goals while providing clean separation between configuration and working data.

## Overview

Mandrake uses a hybrid approach to data management:

- **Database (Postgres)**: Stores all configuration, metadata, and session data
- **Filesystem**: Stores working data and tool outputs

This separation provides a clean division between configuration and content while supporting our workspace/session architecture.

## Database Organization

The central Postgres instance manages all configuration and session data:

### Workspace Configuration

- Workspace metadata (ID, name, description, timestamps)
- Tool configurations and enablement
- Environment variables and context settings
- Access control and permissions
- Model preferences and configurations
- Context refresh policies
- Resource quotas and limits

### Session Management

- Conversation histories
- Tool execution records
- Context references
- Search indices
- User interactions and state

### System Configuration

- Global system settings
- User data and authentication
- Tool registry and global configurations
- Model provider configurations

## Filesystem Organization

Located at `~/.mandrake`:

```shell
~/.mandrake/
├── system/              
│   └── postgres/        # System postgres data
└── workspaces/
    └── <workspace-id>/  # UUID-based workspace folders
        └── work/        # Working directory for enabled tools
```

### Working Directory Usage

The workspace directory serves as:

- Base path for tool operations
- Storage for git repositories
- Location for tool-generated artifacts
- Temporary storage for downloads/uploads
- Cache for tool operations

## Implementation Considerations

### Tool Integration

- Tools are configured globally in the database
- Each workspace enables specific tools
- Tool operations are scoped to workspace directory
- File/git operations naturally contained within workspace

### Security

- Database handles access control and permissions
- Filesystem permissions align with workspace access
- Clear boundaries for sensitive data
- Tool isolation through directory scoping

### Backup and Recovery

- Database backup covers all configuration
- Workspace directories can be backed up independently
- Clear separation allows flexible retention policies
- Simple workspace transfer/sharing model

### Performance

- Single database instance optimizes query performance
- Filesystem operations naturally parallel
- Clear caching boundaries
- Efficient session management

## Alignment with Core Goals

1. **Workspace/Session System**
   - Clean separation between config and content
   - Flexible tool enablement per workspace
   - Clear boundaries for context management

2. **Session Management**
   - Centralized session storage enables cross-workspace search
   - Efficient state tracking in database
   - Clear history preservation model

3. **Model & Tool Integration**
   - Centralized tool configuration
   - Natural filesystem boundaries for tool operations
   - Clear integration points for business systems

## Future Considerations

- Potential for per-workspace databases for larger deployments
- Archive strategies for old session data
- Extended metadata for workspace contents
- Enhanced backup/restore workflows
