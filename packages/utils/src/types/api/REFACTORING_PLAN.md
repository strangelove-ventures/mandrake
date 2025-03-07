# API Package Type Refactoring Plan

## Overview

This plan focuses on extracting and reorganizing the types from the API package into the utils package. The API package contains types related to route definitions, request structures, and response formats that should be made available as shared types.

## Types to Extract

Based on the initial review of the API package, we need to extract the following types:

### Route Types
- Route definitions
- Route parameters
- Route handler types

### Request Types
- Request body schemas
- Request validation types
- Request parameter types

### Response Types
- Response structure
- Error response formats
- Success response formats

## Implementation Steps

### 1. Route Types

Examine the source files:
- `packages/api/src/routes/`
- `packages/api/src/types.ts`

Create the type definitions in:
`packages/utils/src/types/api/routes.ts`

### 2. Request Types

Examine the source files:
- `packages/api/src/routes/`
- `packages/api/src/types.ts`
- Request-specific types in the API package

Create the type definitions in:
`packages/utils/src/types/api/requests.ts`

### 3. Response Types

Examine the source files:
- `packages/api/src/routes/`
- `packages/api/src/types.ts`
- Response-specific types in the API package

Create the type definitions in:
`packages/utils/src/types/api/responses.ts`

## Testing Process

After implementing each section:

1. Update the exports in `packages/utils/src/types/api/index.ts`
2. Test the build with `bun run build` in the utils package
3. Update imports in the API package to use the new types
4. Test the build with `bun run build` in the API package

## Next Steps

1. Start with the route types
2. Move on to request types
3. Implement response types
4. Test and validate
