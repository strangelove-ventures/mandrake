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

### 3. Streaming Conversations

The streaming API uses Server-Sent Events (SSE) to provide real-time updates:

```typescript
// Stream a conversation with proper error and event handling
async function streamConversation(workspaceId: string, sessionId: string, message: string) {
  const response = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/sessions/${sessionId}/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }]
      })
    }
  );

  if (!response.ok) {
    throw await handleApiError(response);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Process the stream
  function processStream(callback: (event: any) => void) {
    return reader.read().then(({ done, value }) => {
      if (done) return;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete events (split by double newline)
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      // Process each complete event
      for (const event of events) {
        if (event.startsWith('data: ')) {
          try {
            const data = JSON.parse(event.slice(6));
            callback(data);
          } catch (e) {
            console.error('Error parsing event:', e);
          }
        }
      }

      // Continue reading
      return processStream(callback);
    });
  }

  // Return a promise that completes when the stream ends
  return new Promise((resolve, reject) => {
    const content: string[] = [];
    
    processStream(event => {
      // Handle different event types
      switch (event.type) {
        case 'content':
          content.push(event.content);
          break;
        case 'tool_call':
          // Handle tool call event
          break;
        case 'tool_result':
          // Handle tool result event
          break;
        case 'end':
          resolve(content.join(''));
          break;
        case 'error':
          reject(new Error(event.error));
          break;
      }
    }).catch(reject);
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
  
  // Stream request with event handling
  private async streamRequest(path: string, body: any) {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw await this.handleError(response);
    }
    
    return response;
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
  
  // Streaming conversation
  async streamConversation(workspaceId: string, sessionId: string, message: string) {
    // Implementation as shown in the streaming example above
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