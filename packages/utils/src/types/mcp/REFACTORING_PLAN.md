# MCP Package Type Refactoring Plan

## Overview

This plan focuses on extracting and reorganizing the types from the MCP (Model Context Protocol) package into the utils package. The MCP package contains server management, transport protocol, and tool types that should be made available as shared types.

## Types to Extract

Based on the initial review of the MCP package, we need to extract the following types:

### Server Types
- Server configuration
- Server status
- Server management interfaces

### Transport Types
- Communication protocols
- Message formats
- Transport interfaces

### Tool Types
- Tool definitions specific to MCP
- Tool execution interfaces
- Tool response formats

## Implementation Steps

### 1. Server Types

Examine the source files:
- `packages/mcp/src/types/index.ts`
- `packages/mcp/src/server.ts`
- `packages/mcp/src/manager.ts`

Create the type definitions in:
`packages/utils/src/types/mcp/server.ts`

### 2. Transport Types

Examine the source files:
- `packages/mcp/src/transport/index.ts`
- `packages/mcp/src/types/index.ts`

Create the type definitions in:
`packages/utils/src/types/mcp/transport.ts`

### 3. Tool Types

Examine the source files:
- `packages/mcp/src/types/index.ts`
- Related files that define MCP-specific tools

Create the type definitions in:
`packages/utils/src/types/mcp/tools.ts`

## Testing Process

After implementing each section:

1. Update the exports in `packages/utils/src/types/mcp/index.ts`
2. Test the build with `bun run build` in the utils package
3. Update imports in the MCP package to use the new types
4. Test the build with `bun run build` in the MCP package

## Next Steps

1. Start with the server types
2. Move on to transport types
3. Implement tool types
4. Test and validate
