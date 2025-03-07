# API Client Implementation Plan

## Overview

The API client will provide a clean, typed interface to interact with the Mandrake backend API. It will handle requests, response parsing, error handling, and provide proper TypeScript types for all operations.

## Key Requirements

1. Type-safe API calls with proper return types
2. Consistent error handling
3. Support for both system-level and workspace-level resources
4. Support for streaming responses (for session messages)
5. Integration with React Query for data fetching and caching
6. Automatic request cancellation when components unmount

## Location Options

We have two potential locations for the API client:

1. **packages/api/src/client**: This would make the client available to all packages
2. **web/src/lib/api-client**: This would keep the client focused on web app needs

**Recommendation**: Place the client in **web/src/lib/api-client** as it's primarily for the web app and can be tailored to the web app's needs. If other packages need API access later, we can refactor.

## API Client Structure

```sh
web/src/lib/api-client/
├── index.ts              # Main exports
├── types.ts              # Shared types
├── utils/
│   ├── fetcher.ts        # Base fetch utility
│   ├── errors.ts         # Error handling
│   └── parsing.ts        # Response parsing
└── endpoints/
    ├── workspaces.ts     # Workspace management
    ├── sessions.ts       # Session management
    ├── files.ts          # File operations
    ├── tools.ts          # Tool operations
    ├── models.ts         # Model operations
    ├── prompt.ts         # Prompt operations
    ├── dynamic.ts        # Dynamic context
    └── system.ts         # System level operations
```

## Implementation Approach

### 1. Base Fetcher Utility

Create a base fetcher utility that handles common concerns:

```typescript
// web/src/lib/api-client/utils/fetcher.ts
import { ApiError } from './errors';

export type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, signal } = options;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = response.headers.get('Content-Type') || '';
  
  if (!response.ok) {
    const errorData = contentType.includes('application/json') 
      ? await response.json() 
      : await response.text();
      
    throw new ApiError(response.status, errorData);
  }
  
  if (contentType.includes('application/json')) {
    return await response.json() as T;
  }
  
  throw new Error(`Unexpected content type: ${contentType}`);
}

export function createApiUrl(path: string, workspaceId?: string): string {
  return workspaceId 
    ? `/api/workspaces/${workspaceId}${path}` 
    : `/api${path}`;
}
```

### 2. Error Handling

Create a standardized API error class:

```typescript
// web/src/lib/api-client/utils/errors.ts
export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(status: number, data: any) {
    super(`API Error: ${status}`);
    this.status = status;
    this.data = data;
  }
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}
```

### 3. Resource-specific Clients

Create clients for each resource type:

```typescript
// web/src/lib/api-client/endpoints/workspaces.ts
import { fetchJson, createApiUrl } from '../utils/fetcher';
import { Workspace, WorkspaceCreateParams, WorkspaceUpdateParams } from '../types';

export async function listWorkspaces(): Promise<Workspace[]> {
  return fetchJson<Workspace[]>(createApiUrl('/workspaces'));
}

export async function getWorkspace(id: string): Promise<Workspace> {
  return fetchJson<Workspace>(createApiUrl(`/workspaces/${id}`));
}

export async function createWorkspace(params: WorkspaceCreateParams): Promise<Workspace> {
  return fetchJson<Workspace>(createApiUrl('/workspaces'), { 
    method: 'POST', 
    body: params 
  });
}

export async function updateWorkspace(id: string, params: WorkspaceUpdateParams): Promise<Workspace> {
  return fetchJson<Workspace>(createApiUrl(`/workspaces/${id}`), { 
    method: 'PUT', 
    body: params 
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  return fetchJson<void>(createApiUrl(`/workspaces/${id}`), { 
    method: 'DELETE' 
  });
}
```

### 4. React Query Integration

Create React Query hooks for data fetching:

```typescript
// web/src/lib/api-client/hooks/useWorkspaces.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } from '../endpoints/workspaces';
import { WorkspaceCreateParams, WorkspaceUpdateParams } from '../types';

// Query keys
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
};

// Hooks
export function useWorkspaces() {
  return useQuery(workspaceKeys.lists(), listWorkspaces);
}

export function useWorkspace(id: string) {
  return useQuery(workspaceKeys.detail(id), () => getWorkspace(id));
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (params: WorkspaceCreateParams) => createWorkspace(params),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(workspaceKeys.lists());
      },
    }
  );
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, params }: { id: string; params: WorkspaceUpdateParams }) => 
      updateWorkspace(id, params),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(workspaceKeys.detail(data.id));
        queryClient.invalidateQueries(workspaceKeys.lists());
      },
    }
  );
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: string) => deleteWorkspace(id),
    {
      onSuccess: (_data, id) => {
        queryClient.removeQueries(workspaceKeys.detail(id));
        queryClient.invalidateQueries(workspaceKeys.lists());
      },
    }
  );
}
```

### 5. Support for Streaming Responses

Create a streaming utility for session messages:

```typescript
// web/src/lib/api-client/utils/streaming.ts
import { SessionMessage } from '../types';

export type MessageStreamHandler = {
  onMessage: (message: SessionMessage) => void;
  onError: (error: any) => void;
  onComplete: () => void;
};

export function streamSessionMessages(
  sessionId: string, 
  workspaceId: string,
  handler: MessageStreamHandler
): () => void {
  const eventSource = new EventSource(
    `/api/workspaces/${workspaceId}/sessions/${sessionId}/stream`
  );
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handler.onMessage(data);
    } catch (error) {
      handler.onError(error);
    }
  };
  
  eventSource.onerror = (error) => {
    handler.onError(error);
    eventSource.close();
  };
  
  return () => {
    eventSource.close();
  };
}
```

### 6. Main Export

Create a clean export interface:

```typescript
// web/src/lib/api-client/index.ts
// Export all endpoint functions
export * from './endpoints/workspaces';
export * from './endpoints/sessions';
export * from './endpoints/files';
export * from './endpoints/tools';
export * from './endpoints/models';
export * from './endpoints/prompt';
export * from './endpoints/dynamic';
export * from './endpoints/system';

// Export React Query hooks
export * from './hooks/useWorkspaces';
export * from './hooks/useSessions';
export * from './hooks/useFiles';
export * from './hooks/useTools';
export * from './hooks/useModels';
export * from './hooks/usePrompt';
export * from './hooks/useDynamic';
export * from './hooks/useSystem';

// Export types
export * from './types';

// Export utilities
export * from './utils/errors';
export * from './utils/streaming';
```

## Next Steps

1. Define all API types in `types.ts`
2. Implement the base utilities (`fetcher.ts`, `errors.ts`)
3. Create endpoint-specific clients one by one
4. Implement React Query hooks for each endpoint
5. Add support for streaming responses
6. Test with example components

## Timeline

- Day 1: Setup base utilities and types
- Day 2-3: Implement all endpoint clients
- Day 4: Add React Query hooks
- Day 5: Implement streaming support
- Day 6: Testing and refinement
