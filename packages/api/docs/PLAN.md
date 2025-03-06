# API Package Implementation Plan

This document outlines the implementation plan for the packages/api package in the Mandrake monorepo, located at packages/api. The API uses Hono as the framework to expose Mandrake's backend functionality to a Next.js frontend, managing system-level and workspace-level operations with a unified interface, streaming responses, and real-object testing with Bun.

## Overview

The API package serves as the bridge between Mandrake's backend (e.g., WorkspaceManager, MCPManager, SessionCoordinator) and the frontend, providing RESTful endpoints for configuration management, tool invocation, session orchestration, and more. It addresses dependency conflicts from the frontend by encapsulating all backend logic, ensuring seamless integration with Next.js.

### Goals

* Expose all Mandrake functionality via a RESTful API.
* Manage singleton and map-based instances efficiently.
* Reuse code between system-level (/system) and workspace-level (/workspaces/:id) routes.
* Support streaming responses for real-time session updates.
* Test with real objects using temporary directories and Bun.

### File Structure

The proposed structure for packages/api ensures modularity and clarity:

```sh
packages/api/
├── src/
│   ├── index.ts              # Main entry point, Hono setup, and route mounting
│   ├── managers.ts           # Manager initialization and lifecycle management
│   ├── routes/
│   │   ├── system.ts         # System-level route definitions
│   │   ├── workspaces.ts     # Workspace-level route definitions
│   │   ├── tools.ts          # Reusable ToolsManager routes
│   │   ├── models.ts         # Reusable ModelsManager routes
│   │   ├── config.ts         # Reusable ConfigManager routes
│   │   ├── prompt.ts         # Reusable PromptManager routes
│   │   └── sessions.ts       # Session-related routes with streaming
│   └── types.ts              # Shared TypeScript types
├── tests/
│   ├── system.test.ts        # System-level API tests
│   ├── workspaces.test.ts    # Workspace-level API tests
│   └── utils.ts              # Test utilities (tmp dirs, cleanup)
├── docs/
│   ├── IMPLEMENTATION_PLAN.md # This file
│   ├── MANAGERS.md           # Detailed manager initialization docs
│   ├── ROUTES.md             # Detailed route specifications
│   └── TESTING.md            # Detailed testing strategy
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

### Implementation Steps

#### 1. Project Setup

* Tasks:
  * Create packages/api directory in the monorepo.
  * Initialize package.json with Hono and necessary dependencies:

```json
{
  "name": "@mandrake/api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target bun",
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "hono": "^4.6.6",
    "@mandrake/workspace": "workspace:*",
    "@mandrake/mcp": "workspace:*",
    "@mandrake/session": "workspace:*",
    "@mandrake/utils": "workspace:*",
    "@mandrake/provider": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0",
    "tmp": "^0.2.3"
  }
}
```

* Extend root tsconfig.json in tsconfig.json:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

* Update root package.json scripts to include api:

```json
{
  "scripts": {
    "build:api": "bun run --cwd packages/api build",
    "dev:api": "PORT=4000 bun run --cwd packages/api dev",
    "test:api": "bun run --cwd packages/api test",
    "clean:api": "bun run --cwd packages/api clean"
  }
}
```

* Outcome: A working package skeleton integrated into the monorepo.

#### 2. Manager Initialization

* File: src/managers.ts
* Tasks:
  * Initialize MandrakeManager as a singleton at startup:

```typescript
import { MandrakeManager } from '@mandrake/workspace';
import { join } from 'path';

const mandrakeManager = new MandrakeManager(join(process.env.HOME || '~', '.mandrake'));
```

* Create maps for workspace-level managers, loading existing workspaces:

```typescript
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { readdir } from 'fs/promises';

const workspaceManagers = new Map<string, WorkspaceManager>();
const mcpManagers = new Map<string, MCPManager>();
const sessionCoordinators = new Map<string, Map<string, SessionCoordinator>>();

async function loadWorkspaces() {
  const wsDir = join(mandrakeManager.paths.workspaces);
  const dirs = await readdir(wsDir, { withFileTypes: true });
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const ws = new WorkspaceManager(wsDir, dir.name);
      await ws.init(dir.name);
      workspaceManagers.set(ws.id, ws);
      mcpManagers.set(ws.id, new MCPManager());
      sessionCoordinators.set(ws.id, new Map());
    }
  }
}

await loadWorkspaces();
```

* Export manager accessors for use in routes.
* Documentation: See docs/MANAGERS.md for detailed initialization logic and lifecycle management.
* Outcome: Persistent managers ready for route access.

#### 3. Core Route Implementation

* Files: src/index.ts, src/routes/*
* Tasks:
  * Set up Hono in src/index.ts:

```typescript
import { Hono } from 'hono';
import { systemRoutes } from './routes/system';
import { workspaceRoutes } from './routes/workspaces';

const app = new Hono();

app.route('/system', systemRoutes);
app.route('/workspaces', workspaceRoutes);

export default {
  port: process.env.PORT || 4000,
  fetch: app.fetch,
};
```

* Implement reusable routes for JSON-based managers in src/routes/tools.ts, src/routes/models.ts, etc.:

```typescript
// src/routes/tools.ts
import { Hono } from 'hono';
import type { ToolsManager } from '@mandrake/workspace';

export function toolsRoutes(manager: ToolsManager) {
  const app = new Hono();

  app.get('/list', async (c) => {
    const tools = await manager.list();
    return c.json(tools);
  });

  app.post('/create', async (c) => {
    const config = await c.req.json();
    await manager.add(config.name, config);
    return c.json({ success: true }, 201);
  });

  return app;
}
```

* Define system routes in src/routes/system.ts:

```typescript
import { Hono } from 'hono';
import { toolsRoutes } from './tools';
import { mandrakeManager } from '../managers';

export const systemRoutes = new Hono()
  .route('/tools', toolsRoutes(mandrakeManager.tools))
  .route('/models', /*similar*/);
Define workspace routes in src/routes/workspaces.ts:
typescript
import { Hono } from 'hono';
import { toolsRoutes } from './tools';
import { workspaceManagers } from '../managers';

export const workspaceRoutes = new Hono()
  .get('/:workspaceId', async (c) => {
    const ws = workspaceManagers.get(c.req.param('workspaceId'));
    if (!ws) return c.json({ error: 'Workspace not found' }, 404);
    return c.json({ id: ws.id, name: ws.name });
  })
  .route('/:workspaceId/tools', (app) =>
    app.use(async (c, next) => {
      const ws = workspaceManagers.get(c.req.param('workspaceId'));
      if (!ws) return c.json({ error: 'Workspace not found' }, 404);
      return toolsRoutes(ws.tools).fetch(c.req.raw, c.env, c.executionCtx);
    })
  );
```

* Documentation: See docs/ROUTES.md for full route specifications and examples.
* Outcome: Functional CRUD routes for JSON-based managers, validated at both system and workspace levels.

#### 4. Session Management and Streaming

* File: src/routes/sessions.ts
* Tasks:
  * Implement session creation and streaming:

```typescript
import { Hono } from 'hono';
import { SessionCoordinator } from '@mandrake/session';
import { workspaceManagers, sessionCoordinators } from '../managers';

export const sessionRoutes = new Hono()
  .post('/create', async (c) => {
    const { workspaceId, title } = await c.req.json();
    const ws = workspaceManagers.get(workspaceId);
    if (!ws) return c.json({ error: 'Workspace not found' }, 404);
    const session = await ws.sessions.createSession({ title });
    const coordinator = new SessionCoordinator({
      metadata: { name: ws.name, path: ws.paths.root },
      sessionManager: ws.sessions,
      mcpManager: mcpManagers.get(workspaceId)!,
      modelsManager: ws.models,
      filesManager: ws.files,
      dynamicContextManager: ws.dynamic,
      promptManager: ws.prompt,
    });
    sessionCoordinators.get(workspaceId)!.set(session.id, coordinator);
    return c.json({ sessionId: session.id }, 201);
  })
  .post('/:sessionId/messages', async (c) => {
    const { workspaceId, message } = await c.req.json();
    const coordinator = sessionCoordinators.get(workspaceId)?.get(c.req.param('sessionId'));
    if (!coordinator) return c.json({ error: 'Session not found' }, 404);
    const stream = await coordinator.processMessage(c.req.param('sessionId'), message);
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  });
```

* Integrate with systemRoutes and workspaceRoutes for both levels.
* Outcome: Streaming session endpoints integrated with Next.js frontend.

#### 5. Testing

* Files: tests/*
* Tasks:
  * Set up test utilities in tests/utils.ts:

```typescript
import tmp from 'tmp';
import { rm } from 'fs/promises';

export async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = tmp.dirSync({ unsafeCleanup: true });
  try {
    await fn(dir.name);
  } finally {
    await rm(dir.name, { recursive: true, force: true });
  }
}
Test system routes in tests/system.test.ts:
typescript
import { test, expect } from 'bun:test';
import { Hono } from 'hono';
import { systemRoutes } from '../src/routes/system';
import { withTempDir } from './utils';

test('list system tools', async () => {
  await withTempDir(async (dir) => {
    const app = new Hono().route('/system', systemRoutes);
    const res = await app.request('/system/tools/list');
    expect(res.status).toBe(200);
  });
});
```

* Documentation: See docs/TESTING.md for detailed testing strategy and examples.
* Outcome: Comprehensive tests validating API functionality with real objects.