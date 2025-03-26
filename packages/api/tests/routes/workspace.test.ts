import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { workspaceManagementRoutes } from '../../src/routes/workspace';
import { ServiceRegistryImpl } from '../../src/services/registry';
import { MandrakeManagerAdapter } from '../../src/services/registry/adapters';
import { ConsoleLogger } from '@mandrake/utils';

// Setup for testing
let tempDir: string;
let mandrakeManager: MandrakeManager;
let workspaceApp: Hono;
let registry: ServiceRegistryImpl;

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'workspace-routes-test-'));
  
  // Initialize a real MandrakeManager
  mandrakeManager = new MandrakeManager(tempDir);
  await mandrakeManager.init();
  
  // Create a registry and register the MandrakeManager
  registry = new ServiceRegistryImpl();
  
  // Create and register MandrakeManagerAdapter
  const mandrakeAdapter = new MandrakeManagerAdapter(mandrakeManager, {
    logger: new ConsoleLogger({ meta: { service: 'MandrakeManagerAdapter', test: true } })
  });
  
  registry.registerService('mandrake-manager', mandrakeAdapter);
  
  // Create test app
  workspaceApp = new Hono();
  workspaceApp.route('/', workspaceManagementRoutes(registry));
});

afterAll(async () => {
  // Clean up
  await rm(tempDir, { recursive: true, force: true });
});

// Test cases
test('Workspace routes - GET / returns empty workspace list initially', async () => {
  const res = await workspaceApp.request('/');
  expect(res.status).toBe(200);
  
  const workspaces = await res.json();
  expect(Array.isArray(workspaces)).toBe(true);
  expect(workspaces.length).toBe(0);
});

test('Workspace routes - POST / creates a new workspace', async () => {
  const workspaceData = {
    name: 'TestWorkspace',
    description: 'A test workspace for API testing',
    path: join(tempDir, 'workspaces', 'test-workspace')
  };
  
  const res = await workspaceApp.request('/', {
    method: 'POST',
    body: JSON.stringify(workspaceData)
  });
  
  expect(res.status).toBe(201);
  const createdWorkspace = await res.json();
  
  expect(createdWorkspace).toHaveProperty('id');
  expect(createdWorkspace).toHaveProperty('name', 'TestWorkspace');
  expect(createdWorkspace).toHaveProperty('description', 'A test workspace for API testing');
  expect(createdWorkspace).toHaveProperty('path');
  
  // Also test listing workspaces after creation
  const listRes = await workspaceApp.request('/');
  const workspaces = await listRes.json();
  expect(workspaces.length).toBe(1);
  expect(workspaces[0]).toHaveProperty('id', createdWorkspace.id);
});

test('Workspace routes - GET /:workspaceId returns workspace details', async () => {
  // First create a workspace
  const workspaceData = {
    name: 'AnotherWorkspace',
    description: 'Another workspace for testing',
    path: join(tempDir, 'workspaces', 'another-workspace')
  };
  
  const createRes = await workspaceApp.request('/', {
    method: 'POST',
    body: JSON.stringify(workspaceData)
  });
  
  const createdWorkspace = await createRes.json();
  const workspaceId = createdWorkspace.id;
  
  // Now get the workspace details
  const res = await workspaceApp.request(`/${workspaceId}`);
  expect(res.status).toBe(200);
  
  const workspace = await res.json();
  expect(workspace).toHaveProperty('id', workspaceId);
  expect(workspace).toHaveProperty('name', 'AnotherWorkspace');
  expect(workspace).toHaveProperty('description', 'Another workspace for testing');
});

test('Workspace routes - GET /:workspaceId returns 404 for non-existent workspace', async () => {
  const res = await workspaceApp.request('/non-existent-id');
  expect(res.status).toBe(404);
  
  const error = await res.json();
  expect(error).toHaveProperty('error');
});

test('Workspace routes - POST / returns 400 for missing required fields', async () => {
  // Missing path
  const missingPath = {
    name: 'MissingPath',
    description: 'A workspace without a path'
  };
  
  const res1 = await workspaceApp.request('/', {
    method: 'POST',
    body: JSON.stringify(missingPath)
  });
  
  expect(res1.status).toBe(400);
  
  // Missing name
  const missingName = {
    description: 'A workspace without a name',
    path: join(tempDir, 'workspaces', 'no-name')
  };
  
  const res2 = await workspaceApp.request('/', {
    method: 'POST',
    body: JSON.stringify(missingName)
  });
  
  expect(res2.status).toBe(400);
});