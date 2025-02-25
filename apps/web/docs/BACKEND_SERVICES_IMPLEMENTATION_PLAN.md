# Backend Services Implementation Plan

## Overview

This document outlines the implementation plan for backend services that will power the API routes in the Mandrake web application. These services will manage workspaces, MCP servers, and session coordinators across multiple concurrent user sessions.

## Goals

- Create a service registry to manage multiple instances of workspaces, MCP servers, and session coordinators
- Implement lazy loading of resources to optimize performance
- Provide clean service lifecycle management
- Support streaming responses for LLM interactions
- Ensure proper cleanup of resources when no longer needed

## Architecture

### Service Registry

A central registry that tracks and manages all service instances:

- Workspaces (WorkspaceManager instances)
- MCP Servers (MCPServerManager instances)
- Session Coordinators (SessionCoordinator instances)

The registry will enforce resource limits, handle lazy initialization, and manage the lifecycle of services.

### Service Initialization

Services will be initialized on-demand in a lazy loading pattern, with initialization happening automatically when a service is requested. This approach works well with Next.js's server components and API routes.

### Resource Cleanup

A periodic cleanup process will release resources that haven't been used for a defined period. This ensures efficient resource usage, especially for Docker containers and other system resources.

## Implementation Details

### File Structure

```
apps/web/src/
  └── lib/
      └── services/
          ├── index.ts           # Main exports
          ├── registry.ts        # Service registry implementation
          ├── init.ts            # Initialization logic
          ├── helpers.ts         # Helper functions for API routes
          └── types.ts           # Type definitions
```

### Service Registry Implementation

The `ServiceRegistry` class will manage all service instances:

```typescript
// Service registry core implementation
class ServiceRegistry {
  private workspaceManagers: Map<string, WorkspaceManager>;
  private mcpManagers: Map<string, MCPServerManager>;
  private sessionCoordinators: Map<string, SessionCoordinator>;
  
  constructor() {
    this.workspaceManagers = new Map();
    this.mcpManagers = new Map();
    this.sessionCoordinators = new Map();
  }
  
  async getWorkspaceManager(workspaceId: string): Promise<WorkspaceManager>;
  async getMCPManager(workspaceId: string): Promise<MCPServerManager>;
  async getSessionCoordinator(workspaceId: string, sessionId: string): Promise<SessionCoordinator>;
  
  async releaseSessionCoordinator(workspaceId: string, sessionId: string): Promise<void>;
  async releaseWorkspaceResources(workspaceId: string): Promise<void>;
  async performCleanup(): Promise<void>;
}
```

### Initialization Logic

The initialization module will handle setup and cleanup:

```typescript
// Initialization logic
let isInitialized = false;

export async function initializeServices(): Promise<void> {
  if (isInitialized) return;
  
  // Set up cleanup intervals
  // Register process shutdown handlers
  
  isInitialized = true;
}
```

### Helper Functions

Helper functions will simplify access to services from API routes:

```typescript
// Helper functions for API routes
export async function getSessionCoordinatorForRequest(workspaceId: string, sessionId: string);
export async function getWorkspaceManagerForRequest(workspaceId: string);
export async function getMCPManagerForRequest(workspaceId: string);
export async function listWorkspaces();
```

## API Route Usage

API routes will use these helper functions to access services:

```typescript
// Example API route implementation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const { id: workspaceId, sessionId } = params;
  const body = await request.json();
  
  const coordinator = await getSessionCoordinatorForRequest(workspaceId, sessionId);
  const result = await coordinator.processMessage(body.message);
  
  return NextResponse.json(result);
}
```

## Streaming Response Implementation

For streaming LLM responses:

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const { id: workspaceId, sessionId } = params;
  const body = await request.json();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const coordinator = await getSessionCoordinatorForRequest(workspaceId, sessionId);
        
        await coordinator.processMessageStream({
          message: body.message,
          onToken: (token) => {
            controller.enqueue(JSON.stringify({ type: 'token', content: token }) + '\n');
          },
          onToolCall: (toolCall) => {
            controller.enqueue(JSON.stringify({ type: 'toolCall', content: toolCall }) + '\n');
          },
          onToolResult: (toolResult) => {
            controller.enqueue(JSON.stringify({ type: 'toolResult', content: toolResult }) + '\n');
          },
          onComplete: () => {
            controller.enqueue(JSON.stringify({ type: 'complete' }) + '\n');
            controller.close();
          }
        });
      } catch (error) {
        controller.enqueue(JSON.stringify({ 
          type: 'error', 
          content: error.message || 'Unknown error' 
        }) + '\n');
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

## Resource Management Considerations

- **Lazy Loading**: Only initialize services when needed
- **Resource Limits**: Set maximum number of concurrent sessions
- **Timeouts**: Implement timeouts for operations that might hang
- **Activity Tracking**: Track last activity timestamp for each service
- **Graceful Degradation**: Handle cases where resources can't be allocated

## Implementation Steps

1. **Create Core Registry**:
   - Implement the `ServiceRegistry` class
   - Create the singleton accessor function

2. **Implement Service Initialization**:
   - Set up initialization logic
   - Add periodic cleanup functionality
   - Implement shutdown handlers

3. **Add Helper Functions**:
   - Create helper functions for API routes
   - Implement workspace discovery

4. **Create API Route Templates**:
   - Implement patterns for regular API endpoints
   - Implement streaming endpoint templates

5. **Testing**:
   - Create unit tests for registry functionality
   - Add integration tests for service lifecycle
   - Test resource cleanup mechanisms

## Monitoring and Debugging

- Add logging throughout the service registry
- Track service lifecycle events
- Monitor resource usage
- Implement health check endpoints

## Future Enhancements

- Add configurable resource limits
- Implement more sophisticated cleanup strategies
- Add monitoring dashboard for service status
- Implement service metrics collection
