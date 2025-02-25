# API Implementation Plan for Mandrake

## Overview

This document outlines the implementation plan for the Mandrake API. It provides a detailed structure of all routes, their HTTP methods, and a strategy for sharing code between similar endpoints at system and workspace levels.

## API Routes Structure

### System-level Resources

```
/api/config
  GET  - Fetch system config
  PUT  - Update system config

/api/models
  GET  - List available models
  POST - Add new model
  
/api/models/[id]
  GET    - Get model details
  PUT    - Update model
  DELETE - Remove model

/api/prompt
  GET - Get system prompt
  PUT - Update system prompt

/api/dynamic
  GET  - List dynamic contexts
  POST - Add dynamic context

/api/dynamic/[contextId]
  GET    - Get dynamic context details
  PUT    - Update dynamic context
  DELETE - Remove dynamic context

/api/tools
  GET  - List system tools
  POST - Add new tool

/api/tools/[serverName]
  GET    - Get tool details
  PUT    - Update tool config
  DELETE - Remove tool

/api/tools/[serverName]/status
  GET - Get tool server status

/api/tools/[serverName]/methods
  GET - List available methods

/api/tools/[serverName]/methods/[methodName]
  POST - Execute tool method

/api/sessions
  GET  - List system-level sessions
  POST - Create new session

/api/sessions/[id]
  GET    - Get session details
  PUT    - Update session (rename, etc.)
  DELETE - Delete session
  
/api/sessions/[id]/messages
  GET  - Get session messages
  POST - Send new message

/api/sessions/[id]/stream
  POST - Send message and stream response
```

### Workspace Resources

```
/api/workspaces
  GET  - List workspaces
  POST - Create workspace

/api/workspaces/[id]
  GET    - Get workspace details
  PUT    - Update workspace
  DELETE - Delete workspace
```

### Workspace-scoped Resources

```
/api/workspaces/[id]/dynamic
  GET  - List workspace dynamic contexts
  POST - Add dynamic context to workspace

/api/workspaces/[id]/dynamic/[contextId]
  GET    - Get dynamic context details
  PUT    - Update dynamic context
  DELETE - Remove dynamic context

/api/workspaces/[id]/models
  GET  - List workspace models
  POST - Add model to workspace
  
/api/workspaces/[id]/models/[modelId]
  GET    - Get workspace model details
  PUT    - Update workspace model
  DELETE - Remove model from workspace

/api/workspaces/[id]/prompt
  GET - Get workspace prompt
  PUT - Update workspace prompt

/api/workspaces/[id]/tools
  GET  - List workspace tools
  POST - Add tool to workspace

/api/workspaces/[id]/tools/[serverName]
  GET    - Get tool details in workspace
  PUT    - Update tool config in workspace
  DELETE - Remove tool from workspace

/api/workspaces/[id]/tools/[serverName]/status
  GET - Get tool server status in workspace

/api/workspaces/[id]/tools/[serverName]/methods
  GET - List methods for workspace tool

/api/workspaces/[id]/tools/[serverName]/methods/[methodName]
  POST - Execute tool method in workspace context

/api/workspaces/[id]/files
  GET  - List workspace files
  POST - Add file to workspace

/api/workspaces/[id]/files/[fileName]
  GET    - Get file content
  PUT    - Update file
  DELETE - Remove file

/api/workspaces/[id]/sessions
  GET  - List workspace sessions
  POST - Create new workspace session

/api/workspaces/[id]/sessions/[sessionId]
  GET    - Get session details
  PUT    - Update session (rename, etc.)
  DELETE - Delete session
  
/api/workspaces/[id]/sessions/[sessionId]/messages
  GET  - Get session messages
  POST - Send new message
  
/api/workspaces/[id]/sessions/[sessionId]/stream
  POST - Send message and stream response
```

## Shared API Logic Implementation

To avoid code duplication between system-level and workspace-level resources, we'll implement a shared handler approach:

### File Structure

```
apps/web/src/
  └── lib/
      └── api/
          ├── handlers/
          │   ├── ConfigHandler.ts
          │   ├── DynamicContextHandler.ts
          │   ├── FilesHandler.ts
          │   ├── ModelsHandler.ts
          │   ├── PromptHandler.ts
          │   ├── SessionsHandler.ts
          │   ├── ToolsHandler.ts
          │   └── WorkspacesHandler.ts
          ├── factories/
          │   ├── createConfigRoutes.ts
          │   ├── createDynamicContextRoutes.ts
          │   ├── createFilesRoutes.ts
          │   ├── createModelRoutes.ts
          │   ├── createPromptRoutes.ts
          │   ├── createSessionRoutes.ts
          │   ├── createToolRoutes.ts
          │   └── createWorkspaceRoutes.ts
          ├── middleware/
          │   ├── errorHandling.ts
          │   └── validation.ts
          └── utils/
              ├── response.ts
              └── types.ts
```

### Resource Handler Implementation

Each resource handler will follow this pattern:

```typescript
// Example: DynamicContextHandler.ts
export class DynamicContextHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  // Methods that work at both levels
  async listContexts(req: NextRequest) {
    if (this.workspaceId) {
      // Workspace-specific implementation
      return this.workspaceManager!.getDynamicContextManager().listContexts();
    } else {
      // System-level implementation
      return getSystemDynamicContextManager().listContexts();
    }
  }
  
  async addContext(req: NextRequest) {
    const body = await req.json();
    
    if (this.workspaceId) {
      // Workspace-specific implementation
      return this.workspaceManager!.getDynamicContextManager().addContext(body);
    } else {
      // System-level implementation
      return getSystemDynamicContextManager().addContext(body);
    }
  }
  
  // Similar methods for other operations
}
```

### Route Factory Implementation

Each route factory will create route handlers using the appropriate resource handler:

```typescript
// Example: createDynamicContextRoutes.ts
export function createDynamicContextRoutes(isWorkspaceScope: boolean = false) {
  return {
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, contextId?: string } } = {}
    ) {
      try {
        const workspaceId = isWorkspaceScope ? params?.id : undefined;
        const contextId = params?.contextId;
        
        let handler: DynamicContextHandler;
        
        if (workspaceId) {
          const workspaceManager = await getWorkspaceManagerForRequest(workspaceId);
          handler = new DynamicContextHandler(workspaceId, workspaceManager);
        } else {
          handler = new DynamicContextHandler();
        }
        
        if (contextId) {
          // Handle specific context requests
          return NextResponse.json(await handler.getContextDetails(contextId));
        } else {
          // Handle context listing
          return NextResponse.json(await handler.listContexts(req));
        }
      } catch (error) {
        // Common error handling
        return handleApiError(error);
      }
    },
    
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      try {
        const workspaceId = isWorkspaceScope ? params?.id : undefined;
        
        let handler: DynamicContextHandler;
        
        if (workspaceId) {
          const workspaceManager = await getWorkspaceManagerForRequest(workspaceId);
          handler = new DynamicContextHandler(workspaceId, workspaceManager);
        } else {
          handler = new DynamicContextHandler();
        }
        
        const result = await handler.addContext(req);
        return NextResponse.json(result, { status: 201 });
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT and DELETE implementations follow the same pattern
  };
}
```

### API Route Implementation

Using the factories in actual route files:

```typescript
// For system-level dynamic contexts: app/api/dynamic/route.ts
import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';

export const { GET, POST } = createDynamicContextRoutes();
```

```typescript
// For workspace-level dynamic contexts: app/api/workspaces/[id]/dynamic/route.ts
import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';

export const { GET, POST } = createDynamicContextRoutes(true);
```

### Common API Utilities

#### Response Formatting

```typescript
// lib/api/utils/response.ts
export function createApiResponse(data: any, statusCode: number = 200) {
  return NextResponse.json(data, { status: statusCode });
}

export function createApiErrorResponse(error: string | Error, statusCode: number = 500) {
  const message = typeof error === 'string' ? error : error.message;
  return NextResponse.json({ error: message }, { status: statusCode });
}

export function createApiStreamResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
```

#### Error Handling

```typescript
// lib/api/middleware/errorHandling.ts
export function handleApiError(error: any) {
  console.error('API Error:', error);
  
  // Handle specific error types
  if (error.code === 'RESOURCE_NOT_FOUND') {
    return createApiErrorResponse(error, 404);
  }
  
  if (error.code === 'VALIDATION_ERROR') {
    return createApiErrorResponse(error, 400);
  }
  
  // Default error handling
  return createApiErrorResponse(
    error instanceof Error ? error.message : 'Unknown error',
    500
  );
}
```

## Detailed Implementation for Each Resource Handler

### 1. ToolsHandler

```typescript
export class ToolsHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  async listTools() {...}
  async addTool(req: NextRequest) {...}
  async getToolDetails(serverName: string) {...}
  async updateTool(serverName: string, req: NextRequest) {...}
  async removeTool(serverName: string) {...}
  async getToolStatus(serverName: string) {...}
  async listMethods(serverName: string) {...}
  async executeMethod(serverName: string, methodName: string, req: NextRequest) {...}
}
```

### 2. ModelsHandler

```typescript
export class ModelsHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  async listModels() {...}
  async addModel(req: NextRequest) {...}
  async getModelDetails(modelId: string) {...}
  async updateModel(modelId: string, req: NextRequest) {...}
  async removeModel(modelId: string) {...}
}
```

### 3. PromptHandler

```typescript
export class PromptHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  async getPrompt() {...}
  async updatePrompt(req: NextRequest) {...}
}
```

### 4. DynamicContextHandler

```typescript
export class DynamicContextHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  async listContexts() {...}
  async addContext(req: NextRequest) {...}
  async getContextDetails(contextId: string) {...}
  async updateContext(contextId: string, req: NextRequest) {...}
  async removeContext(contextId: string) {...}
  async executeContext(contextId: string) {...}
}
```

### 5. SessionsHandler

```typescript
export class SessionsHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  async listSessions() {...}
  async createSession(req: NextRequest) {...}
  async getSessionDetails(sessionId: string) {...}
  async updateSession(sessionId: string, req: NextRequest) {...}
  async deleteSession(sessionId: string) {...}
  async getMessages(sessionId: string) {...}
  async sendMessage(sessionId: string, req: NextRequest) {...}
  async streamMessage(sessionId: string, req: NextRequest, controller: ReadableStreamDefaultController) {...}
}
```

### 6. FilesHandler (Workspace-specific only)

```typescript
export class FilesHandler {
  constructor(
    private workspaceId: string, 
    private workspaceManager: WorkspaceManager
  ) {}

  async listFiles() {...}
  async addFile(req: NextRequest) {...}
  async getFileContent(fileName: string) {...}
  async updateFile(fileName: string, req: NextRequest) {...}
  async deleteFile(fileName: string) {...}
}
```

### 7. ConfigHandler (System-specific only)

```typescript
export class ConfigHandler {
  async getConfig() {...}
  async updateConfig(req: NextRequest) {...}
}
```

### 8. WorkspacesHandler (System-specific only)

```typescript
export class WorkspacesHandler {
  async listWorkspaces() {...}
  async createWorkspace(req: NextRequest) {...}
  async getWorkspaceDetails(workspaceId: string) {...}
  async updateWorkspace(workspaceId: string, req: NextRequest) {...}
  async deleteWorkspace(workspaceId: string) {...}
}
```

## Implementation Phases

1. **Phase 1: Core Infrastructure**
   - Set up shared handler architecture
   - Implement error handling and response utilities
   - Create basic workspace routes

2. **Phase 2: Session Management**
   - Implement session handlers
   - Add streaming support
   - Create message handling

3. **Phase 3: Resource Management**
   - Implement tools, models, and prompt handlers
   - Add dynamic context support
   - Create file management endpoints

4. **Phase 4: Advanced Features**
   - Add configuration management
   - Implement tool method execution
   - Add support for workspace backups

## Testing Strategy

1. **Unit Tests**: Test individual handler methods
2. **Integration Tests**: Test API endpoints with service mocks
3. **End-to-End Tests**: Test complete API flows with real services

## Security Considerations

1. **Input Validation**: Validate all request inputs
2. **Resource Authorization**: Check access permissions for workspaces
3. **Rate Limiting**: Add rate limiting for API endpoints
4. **Error Information**: Ensure errors don't leak sensitive information
