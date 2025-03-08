# API Client Implementation Plan (Updated)

## Overview

The API client will provide a clean, typed interface to interact with the Mandrake backend API. It will handle requests, response parsing, error handling, and provide proper TypeScript types for all operations. The client will leverage the shared types that have been refactored to the `@mandrake/utils` package, providing consistent typing across the entire application.

## Key Requirements

1. Type-safe API calls with proper return types using the shared types from `@mandrake/utils`
2. Consistent error handling
3. Support for both system-level and workspace-level resources
4. Support for streaming responses (for session messages)
5. Integration with React Query for data fetching and caching
6. Automatic request cancellation when components unmount

## Implementation Location

We will implement the API client in **web/src/lib/api** as it's primarily for the web application's needs. This separation allows us to focus on frontend-specific concerns while still utilizing the shared types.

## API Client Structure

```sh
web/src/lib/api/
├── index.ts              # Main exports
├── core/
│   ├── fetcher.ts        # Base fetch utility
│   ├── errors.ts         # Error handling
│   ├── streaming.ts      # Streaming support
│   └── types.ts          # Client-specific types
└── resources/
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

### 1. Types Integration

The first step is to integrate types from the utils package:

```typescript
// web/src/lib/api/core/types.ts
import {
  WorkspaceResponse,
  WorkspaceListResponse,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  SessionResponse,
  // ... other API types
} from '@mandrake/utils/dist/types/api';

// Re-export the types
export {
  WorkspaceResponse,
  WorkspaceListResponse,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  SessionResponse,
  // ... other API types
}

// Client-specific types
export type ApiClientOptions = {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}
```

### 2. Base Fetcher Utility

Create a base fetcher utility that handles common concerns:

```typescript
// web/src/lib/api/core/fetcher.ts
import { ErrorResponse } from '@mandrake/utils/dist/types/api';
import { ApiError } from './errors';

export type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: {
    baseUrl?: string;
    defaultHeaders?: Record<string, string>;
  } = {}) {
    this.baseUrl = options.baseUrl || '/api';
    this.defaultHeaders = options.defaultHeaders || {};
  }

  async fetchJson<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal } = options;
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    const contentType = response.headers.get('Content-Type') || '';
    
    if (!response.ok) {
      const errorData = contentType.includes('application/json') 
        ? await response.json() as ErrorResponse
        : { error: await response.text() };
        
      throw new ApiError(response.status, errorData);
    }
    
    if (contentType.includes('application/json')) {
      return await response.json() as T;
    }
    
    throw new Error(`Unexpected content type: ${contentType}`);
  }

  createUrl(path: string, workspaceId?: string): string {
    return workspaceId 
      ? `/workspaces/${workspaceId}${path}` 
      : path;
  }
}

// Create default instance
export const apiClient = new ApiClient();
```

### 3. Error Handling

Create a standardized API error class:

```typescript
// web/src/lib/api/core/errors.ts
import { ErrorResponse } from '@mandrake/utils/dist/types/api';

export class ApiError extends Error {
  status: number;
  data: ErrorResponse;
  
  constructor(status: number, data: ErrorResponse) {
    super(`API Error: ${status} - ${data.error}`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}
```

### 4. Resource Clients

Create clients for each resource type:

```typescript
// web/src/lib/api/resources/workspaces.ts
import { apiClient } from '../core/fetcher';
import {
  WorkspaceResponse,
  WorkspaceListResponse,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  DeleteResponse
} from '@mandrake/utils/dist/types/api';

export const workspaces = {
  list: async (): Promise<WorkspaceListResponse> => {
    return apiClient.fetchJson<WorkspaceListResponse>('/workspaces');
  },
  
  get: async (id: string): Promise<WorkspaceResponse> => {
    return apiClient.fetchJson<WorkspaceResponse>(`/workspaces/${id}`);
  },
  
  create: async (params: CreateWorkspaceRequest): Promise<WorkspaceResponse> => {
    return apiClient.fetchJson<WorkspaceResponse>('/workspaces', { 
      method: 'POST', 
      body: params 
    });
  },
  
  update: async (id: string, params: UpdateWorkspaceRequest): Promise<WorkspaceResponse> => {
    return apiClient.fetchJson<WorkspaceResponse>(`/workspaces/${id}`, { 
      method: 'PUT', 
      body: params 
    });
  },
  
  delete: async (id: string): Promise<DeleteResponse> => {
    return apiClient.fetchJson<DeleteResponse>(`/workspaces/${id}`, { 
      method: 'DELETE' 
    });
  },
  
  // Workspace config operations
  config: {
    get: async (workspaceId: string) => {
      return apiClient.fetchJson(
        apiClient.createUrl('/config', workspaceId)
      );
    },
    
    update: async (workspaceId: string, config: any) => {
      return apiClient.fetchJson(
        apiClient.createUrl('/config', workspaceId),
        { method: 'PUT', body: config }
      );
    }
  },
  
  // Add other workspace-specific resource endpoints
};
```

### 5. React Query Integration

Create React Query hooks for data fetching:

```typescript
// web/src/hooks/api/useWorkspaces.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaces } from '@/lib/api/resources/workspaces';
import { 
  CreateWorkspaceRequest, 
  UpdateWorkspaceRequest 
} from '@mandrake/utils/dist/types/api';

// Query keys
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
  config: (id: string) => [...workspaceKeys.all, 'config', id] as const,
};

// Hooks
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: () => workspaces.list()
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => workspaces.get(id),
    enabled: !!id
  });
}

export function useWorkspaceConfig(id: string) {
  return useQuery({
    queryKey: workspaceKeys.config(id),
    queryFn: () => workspaces.config.get(id),
    enabled: !!id
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: CreateWorkspaceRequest) => workspaces.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    }
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: UpdateWorkspaceRequest }) => 
      workspaces.update(id, params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    }
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => workspaces.delete(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    }
  });
}
```

### 6. Support for Streaming Responses

Create a streaming utility for session messages:

```typescript
// web/src/lib/api/core/streaming.ts
import {
  StreamingEvent,
  StreamMessageEvent,
  StreamErrorEvent,
  StreamCompleteEvent
} from '@mandrake/utils/dist/types/api';

export type MessageStreamHandler = {
  onMessage: (message: StreamMessageEvent) => void;
  onError: (error: StreamErrorEvent) => void;
  onComplete: (data: StreamCompleteEvent) => void;
};

export function streamSessionMessages(
  sessionId: string, 
  workspaceId: string,
  handler: MessageStreamHandler
): () => void {
  const eventSource = new EventSource(
    `/api/workspaces/${workspaceId}/streaming/sessions/${sessionId}`
  );
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as StreamingEvent;
      
      switch (data.type) {
        case 'message':
          handler.onMessage(data);
          break;
        case 'error':
          handler.onError(data);
          break;
        case 'complete':
          handler.onComplete(data);
          eventSource.close();
          break;
        default:
          console.warn('Unknown streaming event type:', data);
      }
    } catch (error) {
      handler.onError({
        type: 'error',
        error: 'Failed to parse event data',
        details: String(error)
      });
    }
  };
  
  eventSource.onerror = (error) => {
    handler.onError({
      type: 'error',
      error: 'EventSource error',
      details: String(error)
    });
    eventSource.close();
  };
  
  return () => {
    eventSource.close();
  };
}

// React hook for session streaming
export function useSessionStream(sessionId: string, workspaceId: string) {
  const [messages, setMessages] = React.useState<StreamMessageEvent[]>([]);
  const [error, setError] = React.useState<StreamErrorEvent | null>(null);
  const [isComplete, setIsComplete] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    if (!sessionId || !workspaceId) return;
    
    setIsConnected(true);
    const cleanup = streamSessionMessages(sessionId, workspaceId, {
      onMessage: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onError: (err) => {
        setError(err);
        setIsConnected(false);
      },
      onComplete: () => {
        setIsComplete(true);
        setIsConnected(false);
      }
    });
    
    return cleanup;
  }, [sessionId, workspaceId]);

  return {
    messages,
    error,
    isComplete,
    isConnected,
  };
}
```

### 7. Main Export

Create a clean export interface:

```typescript
// web/src/lib/api/index.ts
// Export the client and types
export * from './core/fetcher';
export * from './core/errors';
export * from './core/streaming';
export * from './core/types';

// Export resource-specific clients
import { workspaces } from './resources/workspaces';
import { sessions } from './resources/sessions';
import { files } from './resources/files';
import { tools } from './resources/tools';
import { models } from './resources/models';
import { prompt } from './resources/prompt';
import { dynamic } from './resources/dynamic';
import { system } from './resources/system';

// Create a unified API client object
export const api = {
  workspaces,
  sessions,
  files,
  tools,
  models,
  prompt,
  dynamic,
  system,
};
```

## Next Steps and Implementation Plan

### Phase 1: Core Infrastructure (Day 1)
1. Set up the core API client structure
2. Import and organize types from `@mandrake/utils`
3. Implement base utilities (fetcher, error handling)
4. Create test harness for API client

### Phase 2: Resource Clients (Days 2-3)
1. Implement workspace resource client
2. Implement session resource client
3. Implement tools and models clients
4. Implement remaining resource clients

### Phase 3: React Integration (Day 4)
1. Set up React Query provider
2. Implement basic data fetching hooks
3. Implement mutation hooks
4. Add optimistic updates for better UX

### Phase 4: Streaming Support (Day 5)
1. Implement SSE streaming utilities
2. Create React hooks for streaming session data
3. Add error handling and reconnection logic

### Phase 5: Testing and Documentation (Day 6)
1. Create unit tests for core functionality
2. Create integration tests with mock API
3. Add documentation for all client methods
4. Create example components demonstrating usage

## Key Improvements Over Previous Plan

1. **Leverages Shared Types**: Uses the refactored types from `@mandrake/utils` for consistency
2. **More Modular Structure**: Separates core functionality from resource-specific implementations
3. **Unified API Object**: Provides a clean, organized API surface through a single object
4. **Enhanced Error Handling**: Improved error typing and handling based on API error responses
5. **Streaming Improvements**: Better integration with the streaming API format
6. **React Query v5 Support**: Updated for the latest React Query syntax and features

This implementation plan provides a solid foundation for building a robust, type-safe API client that will seamlessly integrate with the Mandrake backend while providing a great developer experience.