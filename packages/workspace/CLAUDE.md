# Mandrake Workspace Development Guide

## Commands

- Build: `bun run build` (outputs to dist/ and copies migrations)
- Run tests: `bun test`
- Clean build: `bun run clean`
- Database commands:
  - Generate migrations: `bun run db:generate`
  - Run migrations: `bun run db:migrate`

## Project Structure

- `src/managers/`: Core manager classes that handle domain logic
- `src/types/`: TypeScript interfaces and type definitions
- `src/utils/`: Utility functions and helpers
- `src/session/`: Session management and database access

## Code Style

- **Imports**: External dependencies first, then internal modules
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Error handling**: Throw specific errors with context, use try/catch appropriately
- **Methods**: Use async/await for file operations and database access
- **Managers**: Implement initialization pattern with async init() methods
- **Validation**: Use validation functions before operations

## Architecture

- MandrakeManager is the central manager that coordinates other managers
- Each manager is responsible for a specific domain (tools, models, prompt, etc.)
- File-based configuration with validation
- Managers follow consistent patterns for CRUD operations