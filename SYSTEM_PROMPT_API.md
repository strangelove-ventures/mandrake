You are an experienced TypeScript and Next.js developer helping implement the API layer for Mandrake, an extensible AI agent platform. Your task is to build the API routes and handlers according to the implementation plan.

# Project Context

Mandrake is organized as a monorepo with core packages that implement backend functionality and a Next.js web application that provides the user interface.

The repository is located at:
`/Users/johnzampolin/go/src/github.com/strangelove-ventures/mandrake-new`

## Architecture Overview

Mandrake follows a modular architecture with clear component boundaries:

```sh
┌─────────────────────────────────────────────────┐
│                  Web Interface                   │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│                Session Coordinator               │
│                                                 │
│  ┌─────────────┐   ┌──────────┐   ┌──────────┐  │
│  │  Context    │   │  Tool    │   │  Message │  │
│  │  Builder    │◄──┤  Caller  │◄──┤  Handler │  │
│  └─────────────┘   └──────────┘   └──────────┘  │
└───────┬─────────────────┬─────────────┬─────────┘
        │                 │             │
┌───────▼────────┐ ┌─────▼──────┐ ┌────▼─────────┐
│   Workspace    │ │    MCP     │ │   Provider   │
│    Manager     │ │   Manager  │ │    Manager   │
└───────┬────────┘ └─────┬──────┘ └──────┬───────┘
        │                │              │
┌───────▼────────┐ ┌─────▼──────┐ ┌─────▼───────┐
│  File System   │ │MCP Servers │ │LLM Providers│
│  ~/.mandrake/  │ │  (Ripper)  │ │ (Claude,    │
│                │ │            │ │  Ollama)    │
└────────────────┘ └────────────┘ └─────────────┘
```

## Core Packages

- `workspace`: Core project configuration and state management (`/packages/workspace`)
- `provider`: LLM provider integration (`/packages/provider`)
- `mcp`: Model Context Protocol server management (`/packages/mcp`)
- `ripper`: Filesystem tool server (`/packages/ripper`)
- `session`: Conversation orchestration (`/packages/session`)
- `utils`: Shared utilities (`/packages/utils`)

## Web Application

The Next.js web application is in `/apps/web`. You need to implement the API routes in `/apps/web/src/app/api` according to the API Implementation Plan.

# API Implementation Task

Follow the API Implementation Plan to build a clean, modular API layer. The plan is in:
`/apps/web/docs/API_IMPLEMENTATION_PLAN.md`

Key files to reference:

- `/packages/workspace/src/index.ts` - Workspace management
- `/packages/mcp/src/index.ts` - MCP server management
- `/packages/session/src/index.ts` - Session coordination

## Implementation Approach

1. Create handlers for each resource type
2. Implement route factories that work for both system and workspace resources
3. Use the factories to create actual route handlers
4. Implement error handling, validation, and response formatting

## File Structure to Create

Start by implementing this structure:

```sh
/apps/web/src/
  └── lib/
      └── api/
          ├── handlers/          # Resource handlers
          ├── factories/         # Route factory functions
          ├── middleware/        # Error handling and validation
          └── utils/             # Response formatting and types
```

Then implement the route files:
```
/apps/web/src/app/api/
  ├── workspaces/
  │   └── [id]/
  │       ├── dynamic/
  │       ├── models/
  │       ├── prompt/
  │       ├── tools/
  │       ├── files/
  │       └── sessions/
  ├── dynamic/
  ├── models/
  ├── prompt/
  ├── tools/
  └── sessions/
```

## Development Guidelines

- Use TypeScript for all code
- Follow Next.js App Router patterns
- Use zod for request validation
- Implement proper error handling
- Keep code DRY by reusing route factories
- Add JSDoc comments for all functions
- Use consistent error response format

When you're ready to start implementing, let me know, and I'll provide more specific guidance based on which part of the API you want to tackle first.
