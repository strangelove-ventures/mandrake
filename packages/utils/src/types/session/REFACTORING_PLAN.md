# Session Package Type Refactoring Plan

## Overview

This plan focuses on extracting and reorganizing the types from the session package into the utils package. The session package contains types related to session management, message handling, prompt construction, and streaming functionality that should be made available as shared types.

## Types to Extract

Based on the initial review of the session package, we need to extract the following types:

### Session Types
- Session management interfaces
- Session configuration
- Coordinator types

### Message Types
- Message structures
- Message roles
- Message handling interfaces

### Prompt Types
- Prompt builder interfaces
- Prompt section types
- Prompt configuration

### Streaming Types
- Streaming interfaces
- Streaming status
- Event handling types

## Implementation Steps

### 1. Session Types

Examine the source files:
- `packages/session/src/types.ts`
- `packages/session/src/coordinator.ts`
- `packages/session/src/errors.ts`

Create the type definitions in:
`packages/utils/src/types/session/session.ts`

### 2. Message Types

Examine the source files:
- `packages/session/src/types.ts`
- `packages/session/src/utils/messages.ts`

Create the type definitions in:
`packages/utils/src/types/session/messages.ts`

### 3. Prompt Types

Examine the source files:
- `packages/session/src/prompt/types.ts`
- `packages/session/src/prompt/builder.ts`
- `packages/session/src/prompt/sections/`

Create the type definitions in:
`packages/utils/src/types/session/prompt.ts`

### 4. Streaming Types

Examine the source files:
- `packages/session/src/types.ts`
- Streaming-related types in the session package

Create the type definitions in:
`packages/utils/src/types/session/streaming.ts`

## Testing Process

After implementing each section:

1. Update the exports in `packages/utils/src/types/session/index.ts`
2. Test the build with `bun run build` in the utils package
3. Update imports in the session package to use the new types
4. Test the build with `bun run build` in the session package

## Next Steps

1. Start with the session types
2. Move on to message types
3. Implement prompt types
4. Add streaming types
5. Test and validate
