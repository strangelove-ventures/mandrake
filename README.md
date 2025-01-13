# Mandrake

Mandrake is an AI assistant platform that integrates LangChain for orchestration and the Model Context Protocol (MCP) for enhanced tool capabilities.

## Project Structure

```shell
mandrake/
├── apps/
│   └── web/                 # Next.js frontend application
├── packages/
    ├── types/               # Shared TypeScript types
    ├── core/                # Core business logic
    ├── langchain/           # LangChain integration
    ├── mcp/                 # MCP server integration
    └── storage/             # Database layer
```

## Current Status

### Completed

- ✅ Project structure and monorepo setup
- ✅ Package dependencies and build configuration
- ✅ Basic test setup with Jest
- ✅ Next.js web application with Turbopack
- ✅ Basic UI layout and navigation using shadcn/ui
- ✅ Initial page routing for core features

### In Progress

- 🔄 Package implementations
- 🔄 LangChain integration
- 🔄 MCP server connections
- 🔄 Database setup and migrations

### Upcoming

- Frontend test setup with Vitest
- Workspace management implementation
- LLM provider integration
- MCP server configuration
- State management with Zustand

## Getting Started

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start web development server
cd apps/web
npm run dev
```

## Development

The project uses:

- TypeScript for type safety
- Next.js 14+ for the web application
- Turbopack for fast development
- shadcn/ui for components
- Jest for package testing
- LangChain for AI orchestration
- MCP for tool integration
