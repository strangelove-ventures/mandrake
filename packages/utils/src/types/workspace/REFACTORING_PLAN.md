# Workspace Package Type Refactoring Plan

## Overview

This plan focuses on extracting and reorganizing the types from the workspace package into the utils package. The workspace package contains several key type definitions that are used across multiple packages and should be made available as shared types.

## Types to Extract

Based on the initial review of the workspace package, we need to extract the following types:

### Core Workspace Types
- Workspace definitions
- Workspace configuration
- Workspace management interfaces

### Files
- File system types
- File structure representations
- File operation interfaces

### Tools
- Tool definitions
- Tool configuration
- Tool execution interfaces

### Dynamic Context
- Dynamic context rules
- Context evaluation
- Context refresh interfaces

### Prompt
- Prompt sections
- Prompt configuration
- Prompt building interfaces

## Implementation Steps

### 1. Core Workspace Types

Examine the source files:
- `packages/workspace/src/types/workspace/workspace.ts`
- `packages/workspace/src/managers/workspace.ts`

Create the type definitions in:
`packages/utils/src/types/workspace/workspace.ts`

### 2. Files Types

Examine the source files:
- `packages/workspace/src/types/workspace/files.ts`
- `packages/workspace/src/managers/files.ts`

Create the type definitions in:
`packages/utils/src/types/workspace/files.ts`

### 3. Tools Types

Examine the source files:
- `packages/workspace/src/types/workspace/tools.ts`
- `packages/workspace/src/managers/tools.ts`

Create the type definitions in:
`packages/utils/src/types/workspace/tools.ts`

### 4. Dynamic Context Types

Examine the source files:
- `packages/workspace/src/types/workspace/dynamic.ts`
- `packages/workspace/src/managers/dynamic.ts`

Create the type definitions in:
`packages/utils/src/types/workspace/dynamic.ts`

### 5. Prompt Types

Examine the source files:
- `packages/workspace/src/types/workspace/prompt.ts`
- `packages/workspace/src/managers/prompt.ts`

Create the type definitions in:
`packages/utils/src/types/workspace/prompt.ts`

### 6. Configuration Types

Examine the source files:
- `packages/workspace/src/managers/workspaceConfig.ts`
- `packages/workspace/src/managers/mandrakeConfig.ts`

Create the type definitions in:
`packages/utils/src/types/workspace/config.ts`

## Database Schema Handling

For database schema types:

1. Examine the schema in `packages/workspace/src/session/db/schema/`
2. Create clean interfaces in `packages/utils/src/types/workspace/` that match the structure
3. In the original files, create mapping functions between the ORM types and the clean interfaces

## Testing Process

After implementing each section:

1. Update the exports in `packages/utils/src/types/workspace/index.ts`
2. Test the build with `bun run build` in the utils package
3. Update imports in the workspace package to use the new types
4. Test the build with `bun run build` in the workspace package

## Next Steps

1. Start with the core workspace types
2. Move on to files, tools, dynamic context, and prompt types
3. Implement configuration types
4. Handle database schema types
5. Test and validate
