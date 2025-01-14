# MCP Server Management Implementation Plan

## Overview

Mandrake will use a Docker-based approach to manage MCP servers with standardized container structure, consistent data management, and clear server categorization.

Data - persistent data should be stored in a common folder for easy backup/restore. we can use the db identifier to separate data
Secrets - the application db handles the config data which may contain secrets
Logs - we leave them to docker, but we can easily tap into them for debugging

## Server Categories

1. **API Servers**
   - External API access (GitHub, Twitter)
   - Requires: API tokens, network access
   - Examples: github, twitter-mcp, brave-search

2. **System Servers**
   - Host system access (Docker, Kubernetes)
   - Requires: Socket mounts, host access
   - Examples: docker-mcp, mcp-k8s-go

3. **Storage Servers**
   - Local data persistence
   - Requires: Volume mounts
   - Examples: memory, filesystem

4. **Utility Servers**
   - Stateless tools and operations
   - Minimal requirements
   - Examples: brave-search, fetch

## Standard Environment Variables

- `MCP_CONFIG_PATH=/app/config`
- `MCP_DATA_PATH=/app/data`
- `MCP_LOG_LEVEL=info`
- Server-specific env vars (e.g. API tokens)

## Implementation Phases

### Phase 1: Core Infrastructure

- Create base Docker image templates
- Implement standard directory structure
- Build basic server manager
- Test with 1-2 simple servers

### Phase 2: Server Categories

- Implement category-specific configurations
- Build specialized base images
- Develop server health monitoring
- Test with representative servers from each category

### Phase 3: Management Tools

- Build CLI tools for server management
- Implement logging and monitoring
- Add backup/restore functionality
- Create developer documentation

### Phase 4: Integration & Testing

- Integrate with workspace/session system
- Implement comprehensive testing
- Add production monitoring
- Create user documentation

## Future Considerations

1. Heighliner support for MCP
   - SL to host pre-built images
   - Automated builds
   - Version management

2. Developer Tools
   - Testing frameworks
   - Local development setup
   - Debugging tools

## Questions to Resolve

1. How to handle server updates/migrations?
2. What's the backup/restore strategy?
3. How to manage server dependencies?
4. How to handle server crashes/restarts?
5. What metrics to collect for monitoring?

## Next Steps

1. Create basic Docker templates
2. Set up ~/.mandrake structure
3. Implement simple server manager
4. Test with brave-search server
5. Document patterns for other servers