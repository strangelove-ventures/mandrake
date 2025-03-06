# Testing Strategy for API Package

This document details the testing strategy for the packages/api package in the Mandrake monorepo, located at packages/api. The focus is on integration tests that use real objects from other packages (workspace, mcp, session, utils, provider) without mocks, fully instantiating these objects to test complete flows from API endpoints to backend operations. Tests are executed using Bun, leveraging its built-in test runner, and emphasize real-world scenarios with temporary directories for isolation.

## Overview

The API package exposes Mandrake’s functionality through RESTful endpoints and streaming responses, integrating with managers like MandrakeManager, WorkspaceManager, MCPManager, and SessionCoordinator. Our testing strategy Magyar approach ensures that all tests are integration tests, validating the full flow of API operations (e.g., CRUD operations, tool invocation, session streaming) using real instances of these managers and their dependencies. This avoids mocks to ensure reliability and catch integration issues early.

## Goals

* Validate end-to-end functionality of API endpoints.
* Ensure real objects from workspace, mcp, session, utils, and provider packages work as expected.
* Test complete flows, including file system operations, MCP server interactions, SQLite database access, and LLM streaming.
* Maintain isolation and cleanup using temporary directories.

## Testing Principles

1. No Mocks: All tests use real implementations of managers and their dependencies, instantiated as they would be in production. This ensures we test the actual integration points (e.g., MCPManager starting real servers, SessionCoordinator making real LLM calls).
2. Full Instantiation: Objects are fully constructed with real configurations and data, mirroring production usage (e.g., real JSON files, actual SQLite databases).
3. Integration Focus: Tests cover complete flows from HTTP request to response, including side effects (e.g., file writes, database updates).
4. Bun Test Runner: Leverage Bun’s fast test runner for execution, ensuring compatibility with our build system.

## Test Setup

Tests are located in packages/api/tests/ and use temporary directories to isolate test environments. The setup avoids mocks by instantiating real objects from their respective packages.

### Directory Structure

```sh
packages/api/tests/
├── system.test.ts         # Tests for /system routes
├── workspaces.test.ts     # Tests for /workspaces/:id routes
├── utils.ts               # Test utilities (temp dirs, cleanup)
└── fixtures/              # Test data (e.g., JSON configs)
```

### Utility Functions (tests/utils.ts)

* Temporary Directory Management: Use the tmp package to create isolated environments, cleaning up after each test.

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
```

* Setup Helpers: Functions to instantiate managers with real dependencies, e.g., creating a WorkspaceManager with a real file system and SQLite database.

## Test Categories

1. System-Level Routes (/system)

* File: tests/system.test.ts
* Purpose: Validate system-level operations using MandrakeManager.
* Examples:
  * GET /system/tools/list: Start a real MCPManager, launch a test MCP server (e.g., ripper), and verify tool listing.
  * POST /system/config: Write to a real JSON file via MandrakeConfigManager and read it back.
  * POST /system/sessions/create: Create a session with a real SessionCoordinator and SessionManager, writing to a SQLite database.
* Flow: HTTP request → MandrakeManager → sub-managers (e.g., ToolsManager, SessionManager) → file system/SQLite → HTTP response.

1. Workspace-Level Routes (/workspaces/:id)

* File: tests/workspaces.test.ts
* Purpose: Test workspace-specific operations using WorkspaceManager instances.
* Examples:
  * GET /workspaces/:id/tools/list: Instantiate a WorkspaceManager and MCPManager, start a real MCP server, and list tools.
  * POST /workspaces/:id/files: Write a file to a real file system via FilesManager and verify its contents.
  * POST /workspaces/:id/sessions/:sessionId/messages: Use a real SessionCoordinator to process a message, stream a response (mock LLM via a test provider if needed), and verify database updates.
* Flow: HTTP request → WorkspaceManager (from map) → sub-managers → file system/SQLite/MCP servers → HTTP response.

1. Streaming Responses

* Purpose: Validate real-time session updates via SessionCoordinator.
* Example:
  * POST /workspaces/:id/sessions/:sessionId/messages: Instantiate a SessionCoordinator with real dependencies (e.g., MCPManager, ProviderManager), process a message, and stream the response using Hono’s ReadableStream. Verify the stream contains expected data and the session database is updated.
* Flow: HTTP request → SessionCoordinator → LLM call (via ProviderManager) → tool calls (via MCPManager) → streaming response.

## Test Implementation

### Example Test: System Tools Listing

```typescript
import { test, expect } from 'bun:test';
import { Hono } from 'hono';
import { systemRoutes } from '../src/routes/system';
import { withTempDir } from './utils';
import { MandrakeManager } from '@mandrake/workspace';

test('GET /system/tools/list returns tools', async () => {
  await withTempDir(async (dir) => {
    // Instantiate real MandrakeManager
    const mandrakeManager = new MandrakeManager(dir);
    await mandrakeManager.tools.add('test-tool', {
      command: 'echo TEST', // Simple test command
      args: [],
    });

    const app = new Hono().route('/system', systemRoutes);
    const res = await app.request('/system/tools/list');
    expect(res.status).toBe(200);
    const tools = await res.json();
    expect(tools).toContainEqual(expect.objectContaining({ name: 'test-tool' }));
  });
});
```

### Example Test: Workspace File Write

```typescript
import { test, expect } from 'bun:test';
import { Hono } from 'hono';
import { workspaceRoutes } from '../src/routes/workspaces';
import { withTempDir } from './utils';
import { WorkspaceManager } from '@mandrake/workspace';
import { readFile } from 'fs/promises';

test('POST /workspaces/:id/files writes file', async () => {
  await withTempDir(async (dir) => {
    // Instantiate real WorkspaceManager
    const ws = new WorkspaceManager(dir, 'test-ws');
    await ws.init('Test Workspace');
    const app = new Hono().route('/workspaces', workspaceRoutes);

    const res = await app.request(`/workspaces/${ws.id}/files`, {
      method: 'POST',
      body: JSON.stringify({ path: 'test.txt', content: 'Hello' }),
    });
    expect(res.status).toBe(201);

    const content = await readFile(`${ws.paths.root}/test.txt`, 'utf8');
    expect(content).toBe('Hello');
  });
});
```

### Example Test: Session Streaming

```typescript
import { test, expect } from 'bun:test';
import { Hono } from 'hono';
import { workspaceRoutes } from '../src/routes/workspaces';
import { withTempDir } from './utils';
import { WorkspaceManager } from '@mandrake/workspace';
import { SessionCoordinator } from '@mandrake/session';

test('POST /workspaces/:id/sessions/:sessionId/messages streams response', async () => {
  await withTempDir(async (dir) => {
    const ws = new WorkspaceManager(dir, 'test-ws');
    await ws.init('Test Workspace');
    const session = await ws.sessions.createSession({ title: 'Test Session' });
    const coordinator = new SessionCoordinator({
      metadata: { name: ws.name, path: ws.paths.root },
      sessionManager: ws.sessions,
      mcpManager: new MCPManager(),
      modelsManager: ws.models,
      filesManager: ws.files,
      dynamicContextManager: ws.dynamic,
      promptManager: ws.prompt,
    });

    const app = new Hono().route('/workspaces', workspaceRoutes);
    const res = await app.request(`/workspaces/${ws.id}/sessions/${session.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: 'Can you run the "hostname" command to get the system name, then run "pwd" to get the current directory, save both outputs to a file called "system_info.txt" in our workspace, and then confirm the file was created?' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const text = await res.text();
    expect(text).toContain('Test'); // Assuming test provider echoes input
  });
});
```

## Test Execution

* Command: bun test from packages/api/.
* Configuration: Defined in package.json:

```json
{
  "scripts": {
    "test": "bun test"
  }
}
```

* Cleanup: Each test uses withTempDir to ensure no residual state affects subsequent tests.

## Coverage Goals

* Endpoints: Test all routes defined in src/routes/system.ts and src/routes/workspaces.ts.
* Flows: Cover CRUD operations (e.g., config updates), tool invocation (e.g., MCPManager.invokeTool), file operations (e.g., FilesManager.write), and session streaming.
* Edge Cases: Test invalid workspace IDs, missing files, MCP server failures, and session timeouts.

## Dependencies

* Required Packages:
  * tmp: For temporary directories (npm install tmp or bun add tmp).
  * Core Mandrake packages: @mandrake/workspace, @mandrake/mcp, @mandrake/session, @mandrake/utils, @mandrake/provider (already in package.json).
* No Mocks: Avoid libraries like sinon or jest.mock; rely on real implementations.

## Notes

* Performance: Bun’s speed ensures quick test execution, but monitor for slow filesystem operations in large tests.
* LLM Calls: For SessionCoordinator tests, use real provider and take in API keys through .env
* Documentation: Update packages/api/README.md with test instructions post-implementation.

This strategy ensures robust integration testing, validating the API’s real-world behavior without the fragility of mocks, aligning with Mandrake’s goal of reliable, production-ready functionality.
