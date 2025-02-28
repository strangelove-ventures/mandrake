# API Implementation Plan for Mandrake (Revised)

## Overview

This document outlines the implementation plan for the Mandrake API with a simplified approach that directly uses managers in route factories without an intermediate handler layer.

## API Routes Structure

### System-level Resources

```sh
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

/api/tools/[setId]
  GET  - List tools in set
  POST - Add tool to set

/api/tools/[setId]/[serverId]
  GET    - Get tool details
  PUT    - Update tool config
  DELETE - Remove tool

/api/tools/active
  GET - Get active tool set

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

```sh
/api/workspaces
  GET  - List workspaces
  POST - Create workspace

/api/workspaces/[id]
  GET    - Get workspace details
  PUT    - Update workspace
  DELETE - Delete workspace
```

### Workspace-scoped Resources

```sh
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

/api/workspaces/[id]/tools/[setId]
  GET  - List tools in set
  POST - Add tool to set

/api/workspaces/[id]/tools/[setId]/[serverId]
  GET    - Get tool details in workspace
  PUT    - Update tool config in workspace
  DELETE - Remove tool from workspace

/api/workspaces/[id]/tools/active
  GET - Get active tool set

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

## Simplified Implementation Approach

### File Structure

```sh
apps/web/src/
  └── lib/
      └── api/
          ├── factories/
          │   ├── createDynamicContextRoutes.ts
          │   ├── createFilesRoutes.ts
          │   ├── createMandrakeConfigRoutes.ts
          │   ├── createModelRoutes.ts
          │   ├── createPromptRoutes.ts
          │   ├── createSessionRoutes.ts
          │   ├── createToolsRoutes.ts
          │   └── createWorkspacesRoutes.ts
          ├── middleware/
          │   ├── errorHandling.ts
          │   └── validation.ts
          └── utils/
              ├── response.ts
              ├── types.ts
              └── workspace.ts
```

### Direct Manager Usage in Route Factories

```typescript
// Example: createDynamicContextRoutes.ts
export function createDynamicContextRoutes(workspaceScoped = false) {
  return {
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, contextId?: string } } = {}
    ) {
      try {
        let manager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            return createApiErrorResponse('Workspace ID is required', 400);
          }
          const workspace = await getWorkspaceManagerById(params.id);
          manager = workspace.dynamic;
        } else {
          const mandrakeManager = getMandrakeManager();
          manager = mandrakeManager.dynamic;
        }
        
        if (params?.contextId) {
          // Get specific context
          const context = await manager.get(params.contextId);
          return NextResponse.json(context);
        } else {
          // List all contexts
          const contexts = await manager.list();
          return NextResponse.json(contexts);
        }
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      try {
        let manager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            return createApiErrorResponse('Workspace ID is required', 400);
          }
          const workspace = await getWorkspaceManagerById(params.id);
          manager = workspace.dynamic;
        } else {
          const mandrakeManager = getMandrakeManager();
          manager = mandrakeManager.dynamic;
        }
        
        const body = await req.json();
        const validatedBody = validateDynamicContextSchema(body);
        
        const result = await manager.create(validatedBody);
        return NextResponse.json(result, { status: 201 });
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT and DELETE follow the same pattern
  };
}
```

### For System-Only Routes (MandrakeManager)

```typescript
// Example: createWorkspacesRoutes.ts
export function createWorkspacesRoutes() {
  return {
    async GET(req: NextRequest) {
      try {
        const mandrakeManager = getMandrakeManager();
        const workspaces = await mandrakeManager.listWorkspaces();
        return NextResponse.json(workspaces);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    async POST(req: NextRequest) {
      try {
        const mandrakeManager = getMandrakeManager();
        const body = await req.json();
        
        const { name, description, path } = validateWorkspaceCreateSchema(body);
        
        const workspace = await mandrakeManager.createWorkspace(name, description, path);
        return NextResponse.json({
          id: workspace.id,
          name: workspace.name,
          path: workspace.paths.root
        }, { status: 201 });
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}

export function createWorkspaceRoutes() {
  return {
    async GET(req: NextRequest, { params }: { params: { id: string } }) {
      try {
        const { id } = params;
        const mandrakeManager = getMandrakeManager();
        const workspace = await mandrakeManager.getWorkspace(id);
        
        const config = await workspace.config.getConfig();
        return NextResponse.json(config);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    async DELETE(req: NextRequest, { params }: { params: { id: string } }) {
      try {
        const { id } = params;
        const mandrakeManager = getMandrakeManager();
        await mandrakeManager.deleteWorkspace(id);
        return NextResponse.json({ success: true });
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}
```

### Session and Streaming Routes

```typescript
// Example: createSessionRoutes.ts
export function createSessionRoutes(workspaceScoped = false) {
  return {
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string, sessionId?: string } } = {}
    ) {
      try {
        // Get session manager and coordinator
        let sessionManager, coordinator;
        
        if (workspaceScoped) {
          if (!params?.id) {
            return createApiErrorResponse('Workspace ID is required', 400);
          }
          const workspace = await getWorkspaceManagerById(params.id);
          sessionManager = workspace.sessions;
          
          // Create session coordinator for this workspace
          coordinator = createSessionCoordinator(workspace);
        } else {
          const mandrakeManager = getMandrakeManager();
          sessionManager = mandrakeManager.sessions;
          
          // Create session coordinator for system level
          coordinator = createSystemSessionCoordinator();
        }
        
        if (params?.sessionId) {
          // Handle new message in existing session
          const { content } = await req.json();
          
          if (req.headers.get('accept') === 'text/event-stream') {
            // Streaming response
            const stream = new ReadableStream({
              start(controller) {
                coordinator.handleStreamingRequest(params.sessionId!, content, controller);
              }
            });
            
            return createApiStreamResponse(stream);
          } else {
            // Normal request/response
            const result = await coordinator.handleRequest(params.sessionId!, content);
            return NextResponse.json(result);
          }
        } else {
          // Create new session
          const body = await req.json();
          const session = await sessionManager.createSession(body);
          return NextResponse.json(session, { status: 201 });
        }
      } catch (error) {
        return handleApiError(error);
      }
    }
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

## Utility Functions

### Workspace Manager Utilities

```typescript
// lib/api/utils/workspace.ts
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';

// Singleton instance
let mandrakeManager: MandrakeManager;

export function getMandrakeManager(): MandrakeManager {
  if (!mandrakeManager) {
    mandrakeManager = new MandrakeManager(process.env.MANDRAKE_ROOT || '~/.mandrake');
    
    // Initialize if not already initialized
    if (!mandrakeManager.initialized) {
      mandrakeManager.init();
    }
  }
  return mandrakeManager;
}

export async function getWorkspaceManagerById(id: string): Promise<WorkspaceManager> {
  const manager = getMandrakeManager();
  return manager.getWorkspace(id);
}

export function createSessionCoordinator(workspace: WorkspaceManager): SessionCoordinator {
  // Construct a session coordinator for the workspace
  return new SessionCoordinator({
    metadata: {
      name: workspace.name,
      id: workspace.id,
      path: workspace.paths.root
    },
    promptManager: workspace.prompt,
    sessionManager: workspace.sessions,
    mcpManager: getMCPManager(),
    modelsManager: workspace.models,
    filesManager: workspace.files,
    dynamicContextManager: workspace.dynamic
  });
}

export function createSystemSessionCoordinator(): SessionCoordinator {
  const mandrake = getMandrakeManager();
  // Construct a session coordinator with system managers
  return new SessionCoordinator({
    metadata: {
      name: 'system',
      path: mandrake.paths.root
    },
    promptManager: mandrake.prompt,
    sessionManager: mandrake.sessions,
    mcpManager: getMCPManager(),
    modelsManager: mandrake.models,
    filesManager: null, // System doesn't have files manager
    dynamicContextManager: null // System doesn't have dynamic context manager
  });
}

// Singleton MCP Manager
let mcpManager: MCPManager;

export function getMCPManager(): MCPManager {
  if (!mcpManager) {
    mcpManager = new MCPManager();
    // Initialize MCP servers if needed
  }
  return mcpManager;
}
```

### Response Utilities

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

### Validation Middleware

```typescript
// lib/api/middleware/validation.ts
import { z } from 'zod';

export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export const dynamicContextSchema = z.object({
  serverId: z.string(),
  methodName: z.string(),
  params: z.record(z.any()).optional(),
  refresh: z.object({
    enabled: z.boolean()
  }).optional()
});

export function validateDynamicContextSchema(data: unknown) {
  return validateSchema(dynamicContextSchema, data);
}

export const workspaceCreateSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/),
  description: z.string().optional(),
  path: z.string().optional()
});

export function validateWorkspaceCreateSchema(data: unknown) {
  return validateSchema(workspaceCreateSchema, data);
}

// Add other validation schemas as needed
```

## Benefits of This Approach

1. **Simplicity**: Removes an unnecessary abstraction layer by using managers directly
2. **Consistency**: All route factories follow the same pattern with manager access
3. **Type Safety**: Direct manager access preserves TypeScript types
4. **Testability**: Easier to mock managers in tests for route factories
5. **Performance**: One less function call in the execution chain

## Implementation Phases

1. **Phase 1: Core Infrastructure**
   - Set up utility functions for accessing managers
   - Implement validation middleware with Zod schemas
   - Create basic route factories

2. **Phase 2: Workspace Management**
   - Implement workspace routes (list, create, get, delete)
   - Add configuration management endpoints

3. **Phase 3: Resource Management**
   - Implement tools, models, and dynamic context routes
   - Add file management endpoints for workspaces

4. **Phase 4: Session Management**
   - Implement session creation and management
   - Add message handling with streaming support

This revised approach is much cleaner and more direct, leveraging the managers' functionality directly without unnecessary abstraction.
