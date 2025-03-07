# API Routes Map

Based on the code analysis, here is the actual route structure of the API:

## System Routes

- GET `/system` - System info
- GET `/system/config` - System config
- GET `/system/tools/operations` - List tools operations
- GET `/system/tools/configs` - List tool configs
- POST `/system/tools/configs` - Create tool config
- GET `/system/tools/configs/:configId` - Get tool config
- GET `/system/models` - List models
- GET `/system/prompt` - Get prompt config
- PUT `/system/prompt` - Update prompt config

## Workspace Routes

- GET `/workspaces` - List workspaces
- POST `/workspaces` - Create workspace
- GET `/workspaces/:workspaceId` - Get workspace
- GET `/workspaces/:workspaceId/config` - Get workspace config
- GET `/workspaces/:workspaceId/tools/operations` - List workspace tools operations
- GET `/workspaces/:workspaceId/tools/configs` - List workspace tool configs
- POST `/workspaces/:workspaceId/tools/configs` - Create workspace tool config
- GET `/workspaces/:workspaceId/tools/configs/:configId` - Get workspace tool config
- GET `/workspaces/:workspaceId/sessions` - List workspace sessions
- POST `/workspaces/:workspaceId/sessions` - Create workspace session
- GET `/workspaces/:workspaceId/sessions/:sessionId` - Get workspace session

## Test Route Fixes

Here are the test route changes needed:

### From:
```
/workspaces/${workspaceId}/config
/workspaces/${workspaceId}/tools/operations
/workspaces/${workspaceId}/tools/configs
/workspaces/${workspaceId}/sessions
```

### Working Routes:
```
/system/tools/operations
/system/models
/system/prompt
```

This suggests there might be an issue with the workspace middleware not properly mounting workspace-specific routes. The tests may need to be adjusted to reflect the actual route structure, or the API implementation needs to be fixed to properly handle workspace-specific routes.