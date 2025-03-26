# MCP Server Management Routes

This document outlines the API routes for managing MCP servers through the enhanced service registry.

## Key Routes

### Configuration Management

| Method | Route                                | Description                              |
|--------|--------------------------------------|------------------------------------------|
| GET    | `/workspaces/:id/tools/configs`      | List all tool configurations             |
| POST   | `/workspaces/:id/tools/configs`      | Create a new tool configuration          |
| GET    | `/workspaces/:id/tools/configs/:toolId` | Get a specific tool configuration       |
| PUT    | `/workspaces/:id/tools/configs/:toolId` | Update a specific tool configuration    |
| GET    | `/workspaces/:id/tools/configs/active` | Get the active tool configuration        |
| PUT    | `/workspaces/:id/tools/configs/active` | Set the active tool configuration        |

### Server Status & Management

| Method | Route                                    | Description                              |
|--------|------------------------------------------|------------------------------------------|
| GET    | `/workspaces/:id/tools/servers/status`   | Get status of all servers                |
| GET    | `/workspaces/:id/tools/servers/status/:serverId` | Get status of a specific server         |
| POST   | `/workspaces/:id/tools/servers/:serverId/restart` | Restart a specific server               |

## Configuration Switching Process

When a new tool configuration is set as active, the following actions occur:

1. The system validates that the new configuration exists
2. The current active configuration is stored for reference
3. The active configuration is updated in the ToolsManager
4. All running servers from the previous configuration are stopped
5. New servers from the active configuration are started
6. Success response includes details about the previous and new configurations

```typescript
// Example of a configuration switch
await fetch('/workspaces/workspace1/tools/configs/active', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'my-config' })
});
// Response:
// {
//   "success": true,
//   "active": "my-config",
//   "previousActive": "old-config",
//   "servers": 3
// }
```

## Server Management Process

When managing servers, the following principles apply:

1. **Lazy Starting**: Servers are started only when needed (when actively requested or when part of active config)
2. **Safe Stopping**: Servers are safely stopped during configuration changes or when shutting down
3. **Auto-Recovery**: Failed servers may be restarted automatically
4. **Configuration-Aware**: Server operations respect the active configuration settings

## Server Status Format

The server status endpoints return detailed information:

```json
{
  "active": "default",
  "servers": {
    "ripper": {
      "status": "running",
      "health": {
        "isHealthy": true,
        "lastCheck": "2025-03-25T15:30:00.000Z",
        "metrics": {
          "checkCount": 5,
          "failureCount": 0
        }
      },
      "config": {
        "type": "ripper"
      },
      "logs": [
        "Server started successfully",
        "Listening on port 8080"
      ]
    },
    "other-tool": {
      "status": "stopped",
      "config": {
        "type": "other"
      }
    }
  },
  "serverCount": 2,
  "timestamp": "2025-03-25T15:30:00.000Z"
}
```

## Error Handling

- Configuration not found errors return `404 Not Found`
- Invalid configuration errors return `400 Bad Request`
- Server operation failures return detailed error messages with `500 Internal Server Error`
- Missing required parameters return `400 Bad Request`

## Registry Integration

All server management routes use the enhanced registry to access services:

1. Workspace Manager is retrieved via `getWorkspaceManager(workspaceId)`
2. MCP Manager is retrieved via `getMcpManager(workspaceId)`
3. Tool configurations are accessed through the Workspace Manager's `tools` property

This ensures proper service lifecycle management and consistent error handling.

## Usage Examples

### Example 1: Switching Active Configuration

```typescript
// Request
const response = await fetch('/workspaces/workspace1/tools/configs/active', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'ripper-config' })
});
const result = await response.json();

// Response
{
  "success": true,
  "active": "ripper-config",
  "previousActive": "default",
  "servers": 1
}
```

### Example 2: Restarting a Server

```typescript
// Request
const response = await fetch('/workspaces/workspace1/tools/servers/ripper/restart', {
  method: 'POST'
});
const result = await response.json();

// Response
{
  "success": true,
  "id": "ripper",
  "message": "Server ripper has been restarted"
}
```

## Special Considerations

1. **Server State Mismatch**: If a server is in the active configuration but not running, the status will still show it as "stopped"
2. **Config-Aware Operations**: Server operations check if the server is in the active configuration before proceeding
3. **Automatic Fallbacks**: Restart operations will fall back to starting the server if it's not already running
4. **Graceful Errors**: Operation failures are handled gracefully with detailed error messages