# Mandrake API Client Integration Guide

This guide provides a streamlined approach for integrating with the Mandrake API from client applications, focusing on common patterns and best practices.

## Overview

The Mandrake API provides RESTful endpoints for managing workspaces, sessions, models, and tools. This guide will help you integrate with the API efficiently by referencing existing types and showing common usage patterns.

### Base URL

The default base URL for the API is:

```
http://localhost:3001/api
```

### Type Definitions

Rather than duplicating type definitions, refer to the existing types in the codebase:

- Common API Types: [`@mandrake/utils/src/types/api/index.ts`](../node_modules/@mandrake/utils/src/types/api/index.ts)
- Workspace Types: [`@mandrake/utils/src/types/workspace/index.ts`](../node_modules/@mandrake/utils/src/types/workspace/index.ts)
- Session Types: [`@mandrake/utils/src/types/api/session.ts`](../node_modules/@mandrake/utils/src/types/api/session.ts)
- Tool Types: [`@mandrake/utils/src/types/api/tools.ts`](../node_modules/@mandrake/utils/src/types/api/tools.ts)

For a comprehensive reference of all API endpoints, request/response formats, and parameters, refer to the [OpenAPI specification](./openapi.yaml).

## Core Workflows

### 1. Workspace Management

```typescript
// Create a workspace
async function createWorkspace(name: string, description?: string) {
  const response = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description })
  });
  
  if (!response.ok) {
    throw await handleApiError(response);
  }
  
  return await response.json();
}

// List workspaces
async function listWorkspaces() {
  const response = await fetch(`${API_BASE}/workspaces`);
  
  if (!response.ok) {
    throw await handleApiError(response);
  }
  
  return await response.json();
}

// Get workspace by ID
async function getWorkspace(workspaceId: string) {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`);
  
  if (!response.ok) {
    throw await handleApiError(response);
  }
  
  return await response.json();
}
```

### 2. Session Management

```typescript
// Create a session in a workspace
async function createSession(workspaceId: string, name: string, metadata?: Record<string, any>) {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, metadata })
  });
  
  if (!response.ok) {
    throw await handleApiError(response);
  }
  
  return await response.json();
}

// Get session history
async function getSessionHistory(workspaceId: string, sessionId: string) {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/sessions/${sessionId}/history`);
  
  if (!response.ok) {
    throw await handleApiError(response);
  }
  
  return await response.json();
}
```

### 3. Streaming Conversations with WebSockets

The streaming API uses WebSockets to provide real-time bidirectional updates with better performance and without Content Security Policy (CSP) issues. For a comprehensive guide to the WebSocket API, see [WebSocket Streaming API](./WEBSOCKET_STREAMING_API.md).

```typescript
// Stream a conversation using WebSocket connection
function createSessionStream(workspaceId: string, sessionId: string) {
  // Determine WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseUrl = `${protocol}//${window.location.host}/api`;
  const url = workspaceId
    ? `${baseUrl}/workspaces/${workspaceId}/sessions/${sessionId}/streaming/ws`
    : `${baseUrl}/system/sessions/${sessionId}/streaming/ws`;

  // Create WebSocket connection
  const ws = new WebSocket(url);
  
  // Event handlers
  let onReadyHandler: ((event: any) => void) | null = null;
  let onInitializedHandler: ((event: any) => void) | null = null;
  let onTurnHandler: ((event: any) => void) | null = null;
  let onCompletedHandler: ((event: any) => void) | null = null;
  let onErrorHandler: ((event: any) => void) | null = null;
  
  // Connection opened handler
  ws.addEventListener('open', () => {
    console.log('WebSocket connection established');
  });
  
  // Listen for messages
  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different event types
      switch (data.type) {
        case 'ready':
          // WebSocket connection is ready to accept requests
          onReadyHandler?.(data);
          break;
        case 'initialized':
          // Session stream has been initialized with a responseId
          onInitializedHandler?.(data);
          break;
        case 'turn':
          // Content or tool call update
          onTurnHandler?.(data);
          break;
        case 'turn-completed':
          // A turn is completed
          break;
        case 'completed':
          // The entire response is completed
          onCompletedHandler?.(data);
          break;
        case 'error':
          // Error occurred
          onErrorHandler?.(data);
          break;
        default:
          console.warn('Unknown event type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  // Handle WebSocket errors
  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
    onErrorHandler?.({
      type: 'error',
      message: 'WebSocket connection error'
    });
  });
  
  // Handle WebSocket close
  ws.addEventListener('close', (event) => {
    console.log(`WebSocket closed: ${event.code} ${event.reason}`);
  });
  
  // Return interface for interacting with the stream
  return {
    // Send a message to the stream
    sendMessage: (content: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ content }));
        return true;
      }
      return false;
    },
    
    // Set event handlers
    onReady: (handler: (event: any) => void) => {
      onReadyHandler = handler;
    },
    onInitialized: (handler: (event: any) => void) => {
      onInitializedHandler = handler;
    },
    onTurn: (handler: (event: any) => void) => {
      onTurnHandler = handler;
    },
    onCompleted: (handler: (event: any) => void) => {
      onCompletedHandler = handler;
    },
    onError: (handler: (event: any) => void) => {
      onErrorHandler = handler;
    },
    
    // Close the WebSocket connection
    close: () => {
      ws.close();
    }
  };
}

// Usage example
function streamConversationExample(workspaceId: string, sessionId: string, message: string) {
  return new Promise((resolve, reject) => {
    const stream = createSessionStream(workspaceId, sessionId);
    const content: string[] = [];
    
    // Handle ready event (WebSocket connected and ready)
    stream.onReady((event) => {
      console.log('WebSocket ready, sending message...');
      stream.sendMessage(message);
    });
    
    // Handle initialized event (session started)
    stream.onInitialized((event) => {
      console.log('Session initialized with responseId:', event.responseId);
    });
    
    // Handle turn events (content and tool calls)
    stream.onTurn((event) => {
      console.log('Received turn update:', event);
      
      // Collect content
      content.push(event.content || '');
      
      // Handle tool calls if present
      if (event.toolCalls && Array.isArray(event.toolCalls)) {
        event.toolCalls.forEach(toolCall => {
          if (toolCall.call) {
            console.log('Tool call:', toolCall.call);
          }
          if (toolCall.response) {
            console.log('Tool response:', toolCall.response);
          }
        });
      }
    });
    
    // Handle completion
    stream.onCompleted((event) => {
      console.log('Stream completed');
      resolve(content.join(''));
      stream.close();
    });
    
    // Handle errors
    stream.onError((event) => {
      console.error('Stream error:', event);
      reject(new Error(event.message));
      stream.close();
    });
  });
}
```

### 4. Tool Management

```typescript
// List available tool operations
async function listToolOperations(workspaceId: string) {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/tools/operations`);
  
  if (!response.ok) {
    throw await handleApiError(response);
  }
  
  return await response.json();
}

// Create tool configuration
async function createToolConfig(workspaceId: string, config) {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/tools/configs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  
  if (!response.ok) {
    throw await handleApiError(response);
  }
  
  return await response.json();
}
```

## Error Handling

Implement consistent error handling for all API requests:

```typescript
// Error handling utility
async function handleApiError(response: Response) {
  let errorData = { error: response.statusText };
  
  try {
    errorData = await response.json();
  } catch (e) {
    // Use status text if JSON parsing fails
  }
  
  const error = new Error(errorData.error || 'API request failed');
  Object.assign(error, {
    status: response.status,
    code: errorData.code,
    details: errorData.details
  });
  
  return error;
}
```

## Creating a Client Wrapper

For a more organized approach, create a client wrapper that handles common patterns:

```typescript
/**
 * Example client wrapper for the Mandrake API.
 * For type definitions, see @mandrake/utils/src/types/api
 */
class MandrakeClient {
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }
  
  // Generic API request method with error handling
  private async request(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw await this.handleError(response);
    }
    
    return response.json();
  }
  
  // WebSocket streaming
  createSessionStream(workspaceId: string, sessionId: string) {
    // Create WebSocket URL
    const baseUrl = this.baseUrl.replace(/^http/, window.location.protocol === 'https:' ? 'wss' : 'ws');
    const url = workspaceId
      ? `${baseUrl}/workspaces/${workspaceId}/sessions/${sessionId}/streaming/ws`
      : `${baseUrl}/system/sessions/${sessionId}/streaming/ws`;
    
    // Create WebSocket connection
    const ws = new WebSocket(url);
    
    // Set up event handlers and interface (as in the example above)
    let onReadyHandler: ((event: any) => void) | null = null;
    let onInitializedHandler: ((event: any) => void) | null = null;
    let onTurnHandler: ((event: any) => void) | null = null;
    let onCompletedHandler: ((event: any) => void) | null = null;
    let onErrorHandler: ((event: any) => void) | null = null;
    
    // Setup message handling
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'ready': onReadyHandler?.(data); break;
          case 'initialized': onInitializedHandler?.(data); break;
          case 'turn': onTurnHandler?.(data); break;
          case 'completed': onCompletedHandler?.(data); break;
          case 'error': onErrorHandler?.(data); break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle errors
    ws.addEventListener('error', (error) => {
      onErrorHandler?.({
        type: 'error',
        message: 'WebSocket connection error'
      });
    });
    
    // Return the interface
    return {
      sendMessage: (content: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ content }));
          return true;
        }
        return false;
      },
      onReady: (handler: (event: any) => void) => { onReadyHandler = handler; },
      onInitialized: (handler: (event: any) => void) => { onInitializedHandler = handler; },
      onTurn: (handler: (event: any) => void) => { onTurnHandler = handler; },
      onCompleted: (handler: (event: any) => void) => { onCompletedHandler = handler; },
      onError: (handler: (event: any) => void) => { onErrorHandler = handler; },
      close: () => { ws.close(); }
    };
  }
  
  // Error handling
  private async handleError(response: Response) {
    // Implementation as shown above
  }
  
  // Workspace methods
  async listWorkspaces() {
    return this.request('/workspaces');
  }
  
  async createWorkspace(name: string, description?: string) {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }
  
  async getWorkspace(id: string) {
    return this.request(`/workspaces/${id}`);
  }
  
  // Session methods
  async createSession(workspaceId: string, name: string, metadata?: Record<string, any>) {
    return this.request(`/workspaces/${workspaceId}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ name, metadata })
    });
  }
  
  async getSessionHistory(workspaceId: string, sessionId: string) {
    return this.request(`/workspaces/${workspaceId}/sessions/${sessionId}/history`);
  }
  
  // Streaming conversation with WebSockets
  async streamConversation(workspaceId: string, sessionId: string, message: string) {
    return new Promise((resolve, reject) => {
      const stream = this.createSessionStream(workspaceId, sessionId);
      const content: string[] = [];
      
      // Once connected, send the message
      stream.onReady(() => {
        stream.sendMessage(message);
      });
      
      // Collect content from turns
      stream.onTurn((event) => {
        content.push(event.content || '');
      });
      
      // Resolve when complete
      stream.onCompleted(() => {
        resolve(content.join(''));
        stream.close();
      });
      
      // Handle errors
      stream.onError((event) => {
        reject(new Error(event.message));
        stream.close();
      });
    });
  }
  
  // Add other methods as needed...
}
```

## Best Practices

1. **Error Handling**: Always handle API errors consistently.

2. **Rate Limiting**: Implement retry logic with exponential backoff for potentially rate-limited operations.

3. **Resource Cleanup**: Delete sessions and workspaces that are no longer needed.

4. **Input Validation**: Validate inputs before sending to the API to avoid 400 errors.

5. **Type Safety**: Leverage the existing TypeScript definitions for type safety.

6. **Batch Operations**: Where possible, batch operations to reduce the number of API calls.

## Next Steps

For a complete reference of all API endpoints, request and response formats, and parameters, refer to the [OpenAPI specification](./openapi.yaml).

For implementation details of the API itself, see:
- [Service Registry Documentation](../src/services/registry/README.md)
- [Service Adapters Documentation](../src/services/registry/adapters/README.md)