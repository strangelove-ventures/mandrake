# Root Implementation Plan

## Overview

This document outlines the implementation plan for the root level of the Mandrake project, focusing on repository structure, build system configuration, and development workflow.

## Repository Structure

```
mandrake/
├── .gitignore
├── package.json
├── bun.lockb
├── tsconfig.json
├── README.md
├── packages/
│   ├── utils/
│   ├── workspace/
│   ├── mcp/
│   ├── provider/
│   └── session/
└── apps/
    └── web/
```

## Package Configuration

### Root package.json

```json
{
  "name": "mandrake",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "bun run build:packages && bun run build:web",
    "build:packages": "bun run build --cwd packages/*",
    "build:web": "bun run build --cwd apps/web",
    "test": "bun run test:packages && bun run test:web",
    "test:packages": "bun run test --cwd packages/*",
    "test:web": "bun run test --cwd apps/web",
    "test:utils": "bun run test --cwd packages/utils",
    "test:workspace": "bun run test --cwd packages/workspace",
    "test:mcp": "bun run test --cwd packages/mcp",
    "test:provider": "bun run test --cwd packages/provider",
    "test:session": "bun run test --cwd packages/session",
    "dev": "bun run dev --cwd apps/web",
    "lint": "bun run lint:packages && bun run lint:web",
    "lint:packages": "bun run lint --cwd packages/*",
    "lint:web": "bun run lint --cwd apps/web"
  },
  "devDependencies": {
    "typescript": "latest",
    "@types/node": "latest"
  }
}
```

### Root tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "allowJs": true,
    "esModuleInterop": true
  }
}
```

## Build System

### Packages

- Each package in `packages/` will:
  - Use Bun's built-in test runner
  - Have its own `package.json` with specific dependencies
  - Extend the root `tsconfig.json` with package-specific needs
  - Include a `build` script that compiles TypeScript to JS
  - Have a `test` script that runs Bun's test runner

### Web Application

- The Next.js application in `apps/web` will:
  - Use Vitest for testing
  - Extend the root `tsconfig.json` with Next.js-specific configuration
  - Include necessary development dependencies for React testing
  - Use shadcn for UI components

## Testing Strategy

### Package Testing

```typescript
// Example test file structure for packages
import { expect, test, describe } from "bun:test";

describe("feature", () => {
  test("should work as expected", () => {
    // Test implementation
  });
});
```

### Web Testing

```typescript
// Example test file structure for web
import { describe, it, expect } from 'vitest';

describe('Component', () => {
  it('renders correctly', () => {
    // Test implementation
  });
});
```

## Development Workflow

### Setup Commands

1. Initial setup:

```bash
bun create mandrake-new
cd mandrake-new
bun install
```

2. Create package structure:

```bash
mkdir -p packages/{utils,workspace,mcp,provider,session}
mkdir -p apps/web
```

3. Initialize Next.js app:

```bash
cd apps/web
bunx create-next-app@latest . --typescript --tailwind --eslint
```

### Package Template

Each package should follow this structure:

```
packages/[package-name]/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts
└── tests/
    └── index.test.ts
```

## Implementation Steps

1. Repository Setup
   - [x] Create repository with basic structure
   - [x] Initialize root package.json and tsconfig.json
   - [x] Set up .gitignore

2. Package Infrastructure
   - [x] Create package directories
   - [ ] Set up package.json files
   - [ ] Configure TypeScript for each package
   - [ ] Add test setup files

3. Web Application Setup
   - [ ] Initialize Next.js application
   - [ ] Configure Vitest
   - [ ] Set up initial pages structure

4. Development Scripts
   - [ ] Implement build scripts
   - [ ] Set up test runners
   - [ ] Configure lint tooling

## Testing Plan

### Package Testing Requirements

Each package should include:

- Unit tests for all exported functions
- Integration tests for core functionality
- Tests for error conditions
- Tests for edge cases

### Web Testing Requirements

Web application should include:

- Component tests
- API route tests
- Integration tests for key workflows
- Store tests

## Next Steps

1. Begin with utils package implementation
2. Set up initial web application structure
3. Implement workspace package
4. Continue with remaining packages in order of dependency

## Notes

- Keep initial configuration minimal
- Add tooling as needed based on development requirements
- Focus on developer experience and ease of testing
- Maintain clear separation between packages
