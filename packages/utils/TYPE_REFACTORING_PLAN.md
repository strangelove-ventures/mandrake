# Type Refactoring Plan

## Overview

This plan outlines a strategy to refactor and reorganize the TypeScript types in the Mandrake codebase. Currently, types are defined within implementation packages (workspace, mcp, provider, session, api), making them difficult to reuse across packages without creating circular dependencies or pulling in unwanted implementation details.

The goal is to move common type definitions to the `utils` package, creating a clean separation between types that represent data structures and types that are implementation-specific. We want to make sure we can import these types and use them on the client side without pulling in server-side dependencies.

## Current Structure

Types are scattered across various packages:

1. **workspace package**: Database schema definitions and types for workspace-related entities
2. **mcp package**: Types for Model Context Protocol servers and tools
3. **provider package**: Types for LLM providers and models
4. **session package**: Types for session management and messaging
5. **api package**: Types for API routes and responses

## Proposed Structure

```
packages/
├── utils/
│   └── src/
│       ├── common-types.ts                # Existing file
│       ├── index.ts                       # Main exports
│       ├── models/                        # Existing folder
│       │   ├── models.ts
│       │   ├── schemas.ts
│       │   └── tokenization.ts
│       └── types/                         # New types folder
│           ├── index.ts                   # Main type exports
│           ├── base.ts                    # Base entity types
│           ├── workspace/                 # Workspace types
│           │   ├── index.ts
│           │   ├── workspace.ts
│           │   ├── files.ts
│           │   ├── tools.ts
│           │   ├── dynamic.ts
│           │   ├── prompt.ts
│           │   └── config.ts
│           ├── mcp/                       # MCP types 
│           │   ├── index.ts
│           │   ├── server.ts
│           │   ├── transport.ts
│           │   └── tools.ts
│           ├── provider/                  # Provider types
│           │   ├── index.ts
│           │   ├── base.ts
│           │   ├── models.ts
│           │   ├── anthropic.ts
│           │   ├── ollama.ts
│           │   └── xai.ts
│           ├── session/                   # Session types
│           │   ├── index.ts
│           │   ├── session.ts
│           │   ├── messages.ts
│           │   ├── prompt.ts
│           │   └── streaming.ts
│           └── api/                       # API types
│               ├── index.ts
│               ├── routes.ts
│               ├── requests.ts
│               └── responses.ts
```

## Refactoring Workflow

### General Approach

1. **Read the source code first**: Review the package code to understand the type structure before moving types
2. **Extract types incrementally**: Focus on one package at a time, starting with workspace
3. **Keep implementation details out**: Only move pure type definitions, not implementation-specific code
4. **Follow package ordering**: Workspace → MCP → Provider → Session → API
5. **Test after each package**: Ensure builds still work after refactoring each package

### For Each Package

1. Create the appropriate directory structure in `utils/src/types/`
2. Identify the types that need to be moved
3. Create new type files in the utils package
4. Update imports in the original package
5. Test the build to ensure nothing is broken

## Key Principles for Clean Type Propagation

To ensure that type changes in the utils package properly propagate through the dependency tree to the frontend:

1. **Minimize Implementation Properties in Types**: Types should represent data structures, not implementation details
   - Avoid methods and implementation-specific properties in interfaces
   - Use pure data interfaces that only describe the shape of the data

2. **Use Interface Composition**: Build complex types through composition rather than inheritance
   - This keeps types modular and easier to modify without breaking changes

3. **Decouple Types from Implementation**: Implementation packages should adapt to the type interfaces
   - Types should not be designed around implementation details
   - Implementation should conform to the type definitions, not vice versa

4. **Keep Types Simple and Serializable**: Focus on types that can be easily serialized/deserialized
   - Avoid complex objects, functions, or non-serializable properties in shared types
   - Keep types JSON-compatible for clean API boundaries

5. **Clear Type Boundaries**: Establish clear boundaries between shared types and implementation-specific types
   - Create adapter/mapper functions in implementation packages, not in type definitions
   - Use type guards for runtime validation rather than embedding validation in the types

6. **Avoid External Dependencies**: Types should have minimal dependencies
   - Don't import from libraries that wouldn't work in the frontend
   - Keep shared types framework-agnostic

## Package-Specific Plans

Each package will have a detailed refactoring plan:

1. **workspace**: [packages/utils/src/types/workspace/REFACTORING_PLAN.md](planned)
2. **mcp**: [packages/utils/src/types/mcp/REFACTORING_PLAN.md](planned)
3. **provider**: [packages/utils/src/types/provider/REFACTORING_PLAN.md](planned)
4. **session**: [packages/utils/src/types/session/REFACTORING_PLAN.md](planned)
5. **api**: [packages/utils/src/types/api/REFACTORING_PLAN.md](planned)

## Implementation Guidelines

### Type Organization

- Group related types by domain concept
- Use descriptive file names that reflect the domain
- Organize types hierarchically (base types → domain types → specific types)
- Export all types from index files for easy importing

### Type Design

- Keep types focused on data structures, not implementation details
- Use interface extension for type hierarchy
- Define literal types for enums and constants
- Use generics where appropriate
- Include JSDoc comments for complex types

### Implementation-Specific Types

For types that need implementation details:

1. Create mapping functions in the original package
2. Use type assertions or type guards where needed
3. Create adapter functions to convert between implementation types and interface types

## Next Steps

1. Create the directory structure in utils
2. Start with the workspace package refactoring
3. Move on to MCP, Provider, Session, and API in order
4. Update all references to use the new types
5. Test and validate

## Initial Focus: Workspace Package

Since we're starting with the workspace package, we'll create a detailed plan for that first:

1. Create the workspace directory structure
2. Identify workspace types that should be moved (from database schemas, managers, etc.)
3. Create clean interfaces in the utils package
4. Create type mappings for database-specific code
5. Update imports in the workspace package
6. Test the build
