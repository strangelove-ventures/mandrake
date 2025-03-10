# API Client Usage Guide

## Overview

The Mandrake API client provides a structured way to interact with the Mandrake API. It's organized into resource-specific modules that facilitate common operations on workspaces, sessions, and system-level functionality.

## Basic Usage

### Importing the API Client

```typescript
// Import the entire API client
import { api } from '@/lib/api';

// Or import specific resource clients
import { workspaces, sessions, system } from '@/lib/api/resources';
```

### Making API Requests

Each resource client provides methods for common operations:

```typescript
// List workspaces
const workspaceList = await api.listWorkspaces();

// Create a workspace
const newWorkspace = await api.registerWorkspace({
  name: 'My Workspace',
  path: '/path/to/workspace',
  description: 'A workspace for my project'
});

// Get system status
const status = await api.getStatus();
```

## API Client Structure

The API client is organized into three layers:

1. **Core Utilities**: Found in `src/lib/api/core/`
   - `fetcher.ts` - Base HTTP client with error handling
   - `errors.ts` - API-specific error types
   - `streaming.ts` - Utilities for handling streaming responses
   - `types.ts` - TypeScript types for the API client

2. **Resource Clients**: Found in `src/lib/api/resources/`
   - `workspaces.ts` - Workspace management operations
   - `sessions.ts` - Session operations
   - `system.ts` - System-level operations (status, config, etc.)
   - And other resource-specific clients

3. **Main Export**: Found in `src/lib/api/index.ts`
   - Combines all resources into a unified API object

## API Endpoint Structure

The API client uses these endpoint patterns:

- **System endpoints**: `/system/*`
- **Workspace endpoints**: `/workspaces/*`
- **Sessions endpoints**: `/sessions/*`

## Advanced Usage

### Custom Base URL

By default, the API client connects to:
- `http://localhost:4000` when used server-side
- `/api` when used client-side (browser)

To use a custom base URL:

```typescript
import { ApiClient } from '@/lib/api/core/fetcher';

const customClient = new ApiClient({
  baseUrl: 'https://my-mandrake-api.example.com'
});

// Use the custom client
const status = await customClient.fetchJson('/');
```

### Error Handling

The API client throws `ApiError` instances for API-related errors:

```typescript
import { ApiError } from '@/lib/api/core/errors';

try {
  const workspace = await api.getWorkspace('non-existent-id');
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.message}`);
    // Access error details
    console.error(error.data);
  } else {
    console.error('Network or other error:', error);
  }
}
```

### Streaming Responses

For streaming responses (like chat completions):

```typescript
const eventSource = api.streamRequest(sessionId, message);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle streaming data
};

eventSource.onerror = (error) => {
  console.error('Stream error:', error);
  eventSource.close();
};
```

## Resource-Specific Operations

### Workspaces

```typescript
// List all workspaces
const workspaces = await api.listWorkspaces();

// Get a specific workspace
const workspace = await api.getWorkspace(workspaceId);

// Create a workspace
const newWorkspace = await api.registerWorkspace({
  name: 'My Workspace',
  path: '/path/to/workspace',
  description: 'A workspace for my project'
});

// Delete a workspace
await api.unregisterWorkspace(workspaceId);
```

### Sessions

```typescript
// List sessions (optionally filtered by workspace)
const sessions = await api.listSessions({ workspaceId });

// Get a specific session
const session = await api.getSession(sessionId);

// Create a session
const newSession = await api.createSession({
  title: 'My Session',
  workspaceId: workspaceId
});

// Update a session
await api.updateSession(sessionId, {
  title: 'Updated Session Title'
});

// Delete a session
await api.deleteSession(sessionId);
```

### System Configuration

```typescript
// Get system status
const status = await api.getStatus();

// Get system configuration
const config = await api.getConfig();

// Update system configuration
await api.updateConfig({
  // Configuration properties
});

// Get available models
const models = await api.listModels();

// Get active model
const activeModel = await api.getActiveModel();
```

## Extending the API Client

To add new resource clients:

1. Create a new file in `src/lib/api/resources/`
2. Export a resource client object with methods for each operation
3. Import and re-export the client in `src/lib/api/index.ts`

Example:

```typescript
// src/lib/api/resources/newResource.ts
import { apiClient } from '../core/fetcher';

export const newResource = {
  list: async () => {
    return apiClient.fetchJson('/new-resource');
  },
  
  get: async (id: string) => {
    return apiClient.fetchJson(`/new-resource/${id}`);
  },
  
  // Other operations...
};

// Then in src/lib/api/index.ts
export * from './resources/newResource';
```