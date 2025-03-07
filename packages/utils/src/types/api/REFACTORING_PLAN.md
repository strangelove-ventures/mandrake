# API Package Type Refactoring Plan

## Overview

This plan focuses on extracting client-server interface types from the API package into the utils package. The API package contains request and response formats that should be made available as shared types for client applications. By moving these to the utils package, we enable both the server and client to share type definitions without circular dependencies.

## Analysis of API Package

After examining the API package, I found the following key types needed by clients:

1. **Error Handling**: Error response types used across the API
2. **Streaming Support**: Types for streaming session data to clients
3. **Resource API Types**: Request/response types for CRUD operations on:
   - Workspaces
   - Sessions
   - Models/Providers
   - Files
   - Tools
   - Dynamic Context
   - Prompt Configuration

4. **Implicit Types**: Many request/response types are implicit in the route handlers but not explicitly defined as interfaces

## Types to Extract

Based on my analysis, we need to extract these types:

### Common Types

- `ErrorResponse` - Standard error response format
- `SuccessResponse` - Standard success response format

### Request/Response Types

#### Workspace Resource

- `WorkspaceResponse` - Workspace details returned by API
- `CreateWorkspaceRequest` - Parameters for creating a workspace
- `WorkspaceListResponse` - List of workspaces

#### Session Resource

- `SessionResponse` - Session details
- `CreateSessionRequest` - Parameters for creating sessions
- `SessionHistoryResponse` - Complete session history
- `RoundResponse` - Round data
- `TurnResponse` - Turn data

#### Models/Providers

- `ModelResponse` - Model details
- `ProviderResponse` - Provider details
- `CreateModelRequest` - Parameters for creating a model
- `CreateProviderRequest` - Parameters for creating a provider

#### Files

- `FileResponse` - File details
- `CreateFileRequest` - Parameters for creating a file
- `FileListResponse` - List of files

#### Tools

- `ToolConfigResponse` - Tool configuration details
- `ToolSetResponse` - Tool set details
- `UpdateToolRequest` - Parameters for updating tools

#### Dynamic Context

- `DynamicContextResponse` - Dynamic context details
- `CreateContextRequest` - Parameters for creating context
- `UpdateContextRequest` - Parameters for updating context

#### Prompt

- `PromptConfigResponse` - Prompt configuration details
- `UpdatePromptRequest` - Parameters for updating prompt

### Stream Event Types

- `StreamEventType` - Event types for SSE streaming: 'initialized', 'turn', 'turn-completed', 'completed', 'error'
- `StreamInitEvent` - Initialization event
- `TurnEvent` - Turn update event
- `TurnCompletedEvent` - Turn completion event
- `CompletedEvent` - Stream completion event
- `ErrorEvent` - Error event

## Implementation Approach

Since most response types from the API reuse entity types already defined in the workspace package, we should:

1. Create interfaces that extend or compose the existing entity types
2. Define request types that correspond to endpoint parameters
3. Define event types for streaming responses

## Implementation Steps

### 1. Common Types

Create `packages/utils/src/types/api/common.ts`:

- Define `ErrorResponse` and other shared types
- Add proper JSDoc documentation

### 2. Workspace API Types

Create `packages/utils/src/types/api/workspace.ts`:
- Define request/response interfaces for workspace operations
- Reuse existing workspace entity types from `utils/src/types/workspace`

### 3. Session API Types

Create `packages/utils/src/types/api/session.ts`:
- Define request/response interfaces for session operations
- Reuse session entity types already defined in workspace/entities.ts

### 4. Streaming Types

Create `packages/utils/src/types/api/streaming.ts`:
- Define event types for server-sent events
- Define payload structures for stream events

### 5. Other Resource Types

Create additional resource-specific files:
- `packages/utils/src/types/api/models.ts`
- `packages/utils/src/types/api/files.ts`
- `packages/utils/src/types/api/tools.ts`
- `packages/utils/src/types/api/dynamic.ts`
- `packages/utils/src/types/api/prompt.ts`

## Testing Process

After implementing the types:

1. Export all types from `packages/utils/src/types/api/index.ts`
2. Build utils package: `bun run build:utils`
3. Update imports in API package to use the new types
4. Build API package: `bun run build:api`
5. Verify that types are correctly resolved

## Type Organization

```
packages/utils/src/types/api/
├── index.ts           # Main exports
├── common.ts          # Common API types (Error responses, etc.)
├── workspace.ts       # Workspace API types
├── session.ts         # Session API types
├── models.ts          # Model/Provider API types
├── files.ts           # File API types
├── tools.ts           # Tool API types
├── dynamic.ts         # Dynamic context API types
├── prompt.ts          # Prompt API types
└── streaming.ts       # Streaming event types
```

## Implementation Notes

- Focus only on types needed for client-server communication
- Skip internal implementation types (managers, accessors, etc.)
- Prioritize reusing existing types from workspace/provider/mcp packages
- Make response types directly serializable (pure data objects)
- Ensure type compatibility between existing entity types and API response types
- Document all interfaces with JSDoc comments
