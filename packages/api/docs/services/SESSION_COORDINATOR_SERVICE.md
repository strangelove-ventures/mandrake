# SessionCoordinator Service Documentation

This document provides detailed documentation of the SessionCoordinator service, focusing on its role in session streaming, tool invocation orchestration, and integration with other services.

## Service Overview

The SessionCoordinator is responsible for:
- Orchestrating communication between LLMs and MCP tools
- Managing streaming responses with real-time updates
- Building context for LLM requests
- Processing and structuring LLM responses
- Recording session history
- Handling tool invocation and responses

## Initialization Requirements

### Configuration Parameters

The SessionCoordinator requires several dependencies passed through its options:

```typescript
interface SessionCoordinatorOptions {
  // Metadata about the session environment
  metadata: {
    name: string;       // Workspace name or 'system'
    path: string;       // Workspace path or system path
  };
  
  // Required managers
  promptManager: PromptManager;
  sessionManager: SessionManager;
  mcpManager: MCPManager;
  modelsManager: ModelsManager;
  
  // Optional managers (for workspace sessions)
  filesManager?: FilesManager;
  dynamicContextManager?: DynamicContextManager;
  
  // Optional custom logger
  logger?: Logger;
}
```

### Instantiation Process

```typescript
// For system-level session coordinator
const systemCoordinator = new SessionCoordinator({
  metadata: {
    name: 'system',
    path: mandrakeManager.paths.root
  },
  promptManager: mandrakeManager.prompt,
  sessionManager: mandrakeManager.sessions,
  mcpManager: systemMcpManager,
  modelsManager: mandrakeManager.models
});

// For workspace-level session coordinator
const workspaceCoordinator = new SessionCoordinator({
  metadata: {
    name: workspace.name,
    path: workspace.paths.root
  },
  promptManager: workspace.prompt,
  sessionManager: workspace.sessions,
  mcpManager: workspaceMcpManager,
  modelsManager: workspace.models,
  filesManager: workspace.files,
  dynamicContextManager: workspace.dynamic
});
```

### State After Initialization

- SessionCoordinator instance created with all dependencies
- No persistent state is maintained beyond the object instance
- Ready to handle requests and streams

## Streaming Management

### Request Streaming Process

```typescript
async streamRequest(sessionId: string, requestContent: string): Promise<{
  responseId: string;
  stream: AsyncIterable<TurnEntity>;
  completionPromise: Promise<void>;
}> {
  // Get response ID and completion promise from handleRequest
  const { responseId, completionPromise } = await this.handleRequest(sessionId, requestContent);
  
  // Create a turn stream using the session manager's tracking functionality
  const stream = this.createTurnStream(responseId);
  
  return {
    responseId,
    stream,
    completionPromise
  };
}
```

### Stream Creation

```typescript
private createTurnStream(responseId: string): AsyncIterable<any> {
  const sessionManager = this.opts.sessionManager;
  
  return {
    [Symbol.asyncIterator]() {
      let buffer: any[] = [];
      let resolveNext: ((value: IteratorResult<any, any>) => void) | null = null;
      let done = false;
      let removeListener: (() => void) | null = null;
      
      // Set up the turn update listener
      const setupListener = () => {
        removeListener = sessionManager.trackStreamingTurns(responseId, (turn) => {
          // Add turn to buffer and notify waiters
          buffer.push(turn);
          if (resolveNext) {
            const next = resolveNext;
            resolveNext = null;
            next({ done: false, value: buffer.shift() });
          }
          
          // Check for stream completion
          if (turn.status === 'completed') {
            // Check if this is the final turn (no more tool calls)
            let hasToolCalls = false;
            try {
              const toolCallsData = typeof turn.toolCalls === 'string' 
                ? JSON.parse(turn.toolCalls) 
                : turn.toolCalls;
              hasToolCalls = !!(toolCallsData && toolCallsData.call && 
                               Object.keys(toolCallsData.call).length > 0);
            } catch (e) {
              hasToolCalls = false;
            }
            
            // If no more tool calls, finish the stream
            if (!hasToolCalls) {
              done = true;
              // Resolve any waiting promise with done=true
              if (resolveNext && buffer.length === 0) {
                const next = resolveNext;
                resolveNext = null;
                next({ done: true, value: undefined });
                // Clean up
                if (removeListener) {
                  removeListener();
                  removeListener = null;
                }
              }
            }
          }
        });
      };
      
      // Initialize listener
      setupListener();
      
      // Return async iterator interface
      return {
        next, return // Implementation details omitted for brevity
      };
    }
  };
}
```

### Request Handling

```typescript
async handleRequest(sessionId: string, requestContent: string): Promise<{
  responseId: string;
  completionPromise: Promise<void>;
}> {
  // Create round and response
  const { response } = await this.opts.sessionManager.createRound({
    sessionId,
    content: requestContent
  });
  
  // Start asynchronous completion process
  const completionPromise = this.processRequest(sessionId, requestContent, response.id)
    .catch(error => {
      // Log errors but don't break the promise chain
      this.logger.error('Error processing request', { sessionId, error });
    });
  
  // Return immediately with response ID and completion promise
  return {
    responseId: response.id,
    completionPromise
  };
}
```

## Persistence Considerations

### In-Memory State

- SessionCoordinator maintains minimal in-memory state
- Turn buffers are maintained for active streams
- Request processing is asynchronous with state tracked in SessionManager

### Long-Term Persistence

- All persistent state is delegated to SessionManager's SQLite database
- Session history, turns, tool calls are all persisted

### Resource Usage

- Active streams create memory usage proportional to response size
- Listeners are registered for active streams and must be cleaned up
- Async processing may hold event loop during intensive operations

## Cleanup Requirements

### Resources to Release

- **Turn Listeners**: Must be unregistered to prevent memory leaks
- **Pending Operations**: Should be allowed to complete or be terminated gracefully

### Cleanup Process

```typescript
async cleanup(): Promise<void> {
  // We don't really do any cleanup yet but maybe want to later?
  this.logger.info('Cleaning up session coordinator');
}
```

### Current Limitations

- No active tracking of resources in use
- No cancellation support for in-progress operations
- No listener cleanup beyond stream completion

## Service Dependencies

### Required Dependencies

- **SessionManager**: For session data persistence
- **MCPManager**: For tool invocation
- **PromptManager**: For system prompt generation
- **ModelsManager**: For LLM provider configuration

### Optional Dependencies

- **FilesManager**: For file context in workspace sessions
- **DynamicContextManager**: For dynamic context in workspace sessions

## Service Instantiation Patterns

### System-Level SessionCoordinators

In the API, system-level coordinators are:
- Created on-demand per session
- Stored in the `systemSessionCoordinators` map
- Keyed by session ID
- Not proactively cleaned up

```typescript
// In streaming.ts
function getOrCreateSessionCoordinator(
  isSystem: boolean,
  sessionId: string,
  managers: Managers,
  accessors: ManagerAccessors,
  workspaceId?: string
): SessionCoordinator {
  if (isSystem) {
    // For system sessions
    coordinator = managers.systemSessionCoordinators.get(sessionId);
    if (!coordinator) {
      coordinator = new SessionCoordinator({
        metadata: {
          name: 'system',
          path: managers.mandrakeManager.paths.root
        },
        promptManager: managers.mandrakeManager.prompt,
        sessionManager: managers.mandrakeManager.sessions,
        mcpManager: managers.systemMcpManager,
        modelsManager: managers.mandrakeManager.models
      });
      managers.systemSessionCoordinators.set(sessionId, coordinator);
    }
  }
  // ...
}
```

### Workspace-Level SessionCoordinators

In the API, workspace-level coordinators are:
- Created on-demand per session
- Stored in nested maps: `sessionCoordinators.get(workspaceId).get(sessionId)`
- Created with additional workspace-specific managers
- Not proactively cleaned up

```typescript
// In streaming.ts
function getOrCreateSessionCoordinator(
  isSystem: boolean,
  sessionId: string,
  managers: Managers,
  accessors: ManagerAccessors,
  workspaceId?: string
): SessionCoordinator {
  // ...
  if (!isSystem) {
    const wsId = workspaceId!;
    const coordMap = accessors.getSessionCoordinatorMap(wsId);
    if (coordMap) {
      coordinator = coordMap.get(sessionId);
    }
    
    if (!coordinator) {
      const workspace = accessors.getWorkspaceManager(wsId);
      const mcpManager = accessors.getMcpManager(wsId);
      
      coordinator = new SessionCoordinator({
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
      
      accessors.createSessionCoordinator(wsId, sessionId, coordinator);
    }
  }
  // ...
}
```

## Current Usage in API

### Streaming Routes

```typescript
// Stream a new request and response
app.post('/:sessionId/request', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  // Get or create a session coordinator
  const coordinator = getOrCreateSessionCoordinator(
    isSystem, 
    sessionId, 
    managers, 
    accessors, 
    workspaceId
  );
  
  // Get the request content
  const { content } = await c.req.json();
  
  // Get stream, response ID, and completion promise from the coordinator
  const { responseId, stream, completionPromise } = await coordinator.streamRequest(sessionId, content);
  
  // Convert the AsyncIterable to a ReadableStream for SSE
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial event
        controller.enqueue(`data: ${JSON.stringify(initEvent)}\n\n`);
        
        // Stream each turn update as an SSE event
        for await (const turn of stream) {
          // Send turn update events
          controller.enqueue(`data: ${JSON.stringify(turnEvent)}\n\n`);
        }
        
        // Send completed event when stream ends
        controller.enqueue(`data: ${JSON.stringify(finalEvent)}\n\n`);
        controller.close();
      } catch (error) {
        // Handle streaming errors
        controller.enqueue(`data: ${JSON.stringify(errorEvent)}\n\n`);
        controller.close();
      }
    }
  });
  
  await completionPromise;
  
  // Return the SSE response
  return c.body(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});
```

### Prompt Routes

```typescript
// Get session prompt for a session
app.get('/:sessionId/prompt', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  // Get or create a session coordinator
  const coordinator = getOrCreateSessionCoordinator(
    isSystem, 
    sessionId, 
    managers, 
    accessors, 
    workspaceId
  );
  
  // Build the context which includes the system prompt
  const context = await coordinator.buildContext(sessionId);
  
  // Return the system prompt
  return c.json({
    sessionId,
    systemPrompt: context.systemPrompt
  });
});
```

## Known Issues and Limitations

1. **No Coordinator Lifecycle Management**: Coordinators are created but never cleaned up
2. **Memory Leaks**: Potential for memory leaks due to uncleaned coordinators
3. **No Resource Limits**: No constraints on number of active coordinators
4. **No Operation Cancellation**: No way to cancel in-progress operations
5. **Limited Error Recovery**: Basic error handling without sophisticated recovery

## Enhanced Registry Integration

With the new enhanced ServiceRegistry, SessionCoordinator instances can be created on-demand through factory functions:

```typescript
// Register a factory function for creating SessionCoordinators
registry.registerServiceFactory('sessionCoordinator', async (registry) => {
  // Get dependencies from the registry
  const sessionManager = await registry.getService('sessionManager');
  const promptManager = await registry.getService('promptManager');
  const mcpManager = await registry.getService('mcpManager');
  const modelsManager = await registry.getService('modelsManager');
  
  // Create and return the coordinator
  return new SessionCoordinator({
    metadata: { name: 'system', path: rootPath },
    sessionManager,
    promptManager,
    mcpManager,
    modelsManager
  });
});

// For workspace-specific coordinators
registry.registerWorkspaceFactoryFunction('sessionCoordinator', async (registry, workspaceId) => {
  // Get workspace-specific dependencies
  const workspace = await registry.getWorkspaceService(workspaceId, 'workspaceManager');
  const mcpManager = await registry.getWorkspaceService(workspaceId, 'mcpManager');
  
  // Create and return workspace-specific coordinator
  return new SessionCoordinator({
    metadata: { name: workspace.name, path: workspace.paths.root },
    sessionManager: workspace.sessions,
    promptManager: workspace.prompt,
    mcpManager,
    modelsManager: workspace.models,
    filesManager: workspace.files,
    dynamicContextManager: workspace.dynamic
  });
});

// Later, get the service when needed
const sessionCoordinator = await registry.getService('sessionCoordinator');
// Or for workspace-specific
const wsSessionCoordinator = await registry.getWorkspaceService(workspaceId, 'sessionCoordinator');
```

## Improvement Recommendations

### 1. Implement Coordinator Lifecycle Management

- Add activity tracking for coordinators
- Implement idle timeout for inactive coordinators
- Add explicit cleanup methods
- Implement coordinator registry

```typescript
// Example implementation
class SessionCoordinatorManager {
  private coordinators = new Map<string, {
    coordinator: SessionCoordinator;
    lastActivity: number;
    isActive: boolean;
  }>();
  
  // Get or create a coordinator with proper lifecycle management
  getCoordinator(sessionId: string, workspaceId?: string): SessionCoordinator {
    const key = workspaceId ? `${workspaceId}:${sessionId}` : sessionId;
    
    let entry = this.coordinators.get(key);
    if (!entry) {
      // Create new coordinator with proper dependencies
      const coordinator = new SessionCoordinator({
        // Configuration options...
      });
      
      entry = {
        coordinator,
        lastActivity: Date.now(),
        isActive: false
      };
      this.coordinators.set(key, entry);
    }
    
    // Update activity timestamp
    entry.lastActivity = Date.now();
    return entry.coordinator;
  }
  
  // Mark a coordinator as active/inactive
  setActiveStatus(sessionId: string, isActive: boolean, workspaceId?: string): void {
    const key = workspaceId ? `${workspaceId}:${sessionId}` : sessionId;
    const entry = this.coordinators.get(key);
    if (entry) {
      entry.isActive = isActive;
      entry.lastActivity = Date.now();
    }
  }
  
  // Clean up inactive coordinators
  cleanupInactive(maxIdleTimeMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [key, entry] of this.coordinators.entries()) {
      if (!entry.isActive && (now - entry.lastActivity) > maxIdleTimeMs) {
        entry.coordinator.cleanup();
        this.coordinators.delete(key);
      }
    }
  }
}
```

### 2. Add Operation Cancellation Support

- Implement request cancellation
- Add timeouts for long-running operations
- Support client disconnect detection
- Implement graceful cancellation

```typescript
// Example implementation
async streamRequest(
  sessionId: string, 
  requestContent: string,
  options?: {
    timeoutMs?: number;
    abortSignal?: AbortSignal;
  }
): Promise<{
  responseId: string;
  stream: AsyncIterable<any>;
  completionPromise: Promise<void>;
  cancel: () => void;
}> {
  // Create cancellation token
  const abortController = new AbortController();
  const signal = options?.abortSignal || abortController.signal;
  
  // Handle timeout
  let timeoutId: NodeJS.Timeout | undefined;
  if (options?.timeoutMs) {
    timeoutId = setTimeout(() => abortController.abort(new Error('Request timed out')), options.timeoutMs);
  }
  
  // Handle request with cancellation support
  const { responseId, completionPromise } = await this.handleRequestWithCancellation(
    sessionId, 
    requestContent,
    signal
  );
  
  // Create stream with cancellation support
  const stream = this.createCancellableStream(responseId, signal);
  
  // Return cancel function
  const cancel = () => {
    abortController.abort(new Error('Request cancelled'));
    if (timeoutId) clearTimeout(timeoutId);
  };
  
  return {
    responseId,
    stream,
    completionPromise,
    cancel
  };
}
```

### 3. Implement Resource Limits

- Add concurrent coordinator limits
- Implement memory usage monitoring
- Add request rate limiting
- Implement graceful degradation

```typescript
// Example implementation
class ResourceLimitedCoordinatorManager {
  private maxCoordinators = 100;
  private maxConcurrentRequests = 20;
  private currentRequests = 0;
  
  async getCoordinator(sessionId: string, workspaceId?: string): Promise<SessionCoordinator> {
    // Check if we've hit the limit
    if (this.coordinators.size >= this.maxCoordinators) {
      // Clean up some old coordinators or reject
      await this.enforceResourceLimits();
    }
    
    // Regular coordinator creation logic
  }
  
  async startRequest(): Promise<() => void> {
    // Wait if too many concurrent requests
    if (this.currentRequests >= this.maxConcurrentRequests) {
      await this.waitForAvailableSlot();
    }
    
    this.currentRequests++;
    return () => {
      this.currentRequests--;
    };
  }
  
  private async enforceResourceLimits(): Promise<void> {
    // Implementation to clean up oldest or least used coordinators
  }
  
  private async waitForAvailableSlot(): Promise<void> {
    // Implementation of request queuing
  }
}
```

### 4. Enhance Error Recovery

- Implement retry logic for recoverable errors
- Add fallback strategies for different failure modes
- Implement circuit breaker for dependent services
- Add better error classification

```typescript
// Example implementation
async processRequest(
  sessionId: string, 
  requestContent: string, 
  responseId: string,
  retryOptions?: {
    maxRetries?: number;
    retryableErrors?: string[];
    backoffMs?: number;
  }
): Promise<void> {
  const maxRetries = retryOptions?.maxRetries || 3;
  const retryableErrors = retryOptions?.retryableErrors || ['RATE_LIMITED', 'TEMPORARY_FAILURE'];
  const backoffMs = retryOptions?.backoffMs || 1000;
  
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      // Regular processing logic
      return await this.doProcessRequest(sessionId, requestContent, responseId);
    } catch (error) {
      attempt++;
      
      // Check if we should retry
      const errorCode = this.getErrorCode(error);
      if (attempt <= maxRetries && retryableErrors.includes(errorCode)) {
        // Log retry attempt
        this.logger.warn('Retrying request processing', { 
          sessionId, 
          responseId, 
          attempt, 
          errorCode
        });
        
        // Wait before retry with exponential backoff
        await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt - 1)));
        continue;
      }
      
      // Non-retryable error or max retries reached
      throw error;
    }
  }
}
```

### 5. Add Monitoring and Observability

- Implement detailed metrics collection
- Add performance monitoring
- Implement structured logging
- Add health reporting

```typescript
// Example implementation
interface CoordinatorMetrics {
  activeStreams: number;
  totalRequestsProcessed: number;
  totalStreamingTimeMs: number;
  averageResponseTimeMs: number;
  errorRate: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
}

// Add to SessionCoordinator
getMetrics(): CoordinatorMetrics {
  return {
    // Implementation details...
  };
}
```

## Implementation Plan

1. **Create Coordinator Manager**:
   - Implement coordinator registry
   - Add lifecycle management
   - Implement cleanup strategies

2. **Add Cancellation Support**:
   - Implement abort signal support
   - Add timeout handling
   - Support client disconnect detection

3. **Implement Resource Limits**:
   - Add coordinator limits
   - Implement request limiting
   - Add memory monitoring

4. **Enhance Error Recovery**:
   - Implement retry strategies
   - Add fallback mechanisms
   - Improve error classification

5. **Add Monitoring**:
   - Implement metrics collection
   - Add performance tracking
   - Enhance logging and diagnostics