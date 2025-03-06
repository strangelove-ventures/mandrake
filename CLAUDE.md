# Mandrake Development Guide

## Commands
- Build all packages: `bun run build`
- Build specific package: `bun run build:workspace` (or mcp, provider, session, etc.)
- Run all tests: `bun test`
- Run specific package tests: `bun run test:workspace` (or other package name)
- Run specific test file: `bun test tests/managers/workspace.test.ts`
- Run tests by pattern: `bun test --test-name-pattern "should create"`
- Run only focused tests: `bun test --only` (with test.only() in code)
- Lint: `bun run lint`
- Clean: `bun run clean`
- Start development: `bun run dev`

## Code Style
- **Imports**: External dependencies first, then internal modules
- **Type Safety**: Use strict TypeScript, explicit return types, avoid any
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Throw specific errors with context
- **Tests**: Use bun:test with describe/test blocks and beforeEach/afterEach
- **Managers**: Implement initialization pattern with async init() methods
- **Async**: Use async/await for all asynchronous operations

## Project Structure
- Monorepo with packages in `packages/` directory
- Each package has standard structure: src/, tests/, dist/
- Managers handle domain logic and follow consistent patterns
- Configuration is file-based with validation using Zod