import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { workspaceManagementRoutes } from '../../src/routes/workspace';
import type { Managers, ManagerAccessors } from '../../src/types';

// Setup for testing
let tempDir: string;
let mandrakeManager: MandrakeManager;
let workspaceApp: Hono;
let managers: Managers;
let accessors: ManagerAccessors;

// Maps for storage
const workspaceManagers = new Map();
const mcpManagers = new Map();
const sessionCoordinators = new Map();
const systemSessionCoordinators = new Map();

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'workspace-routes-test-'));
  
  // Initialize a real MandrakeManager
  mandrakeManager = new MandrakeManager(tempDir);
  await mandrakeManager.init();
  
  // Create a real MCPManager
  const systemMcpManager = new MCPManager();
  
  // Set up managers object with real managers
  managers = {
    mandrakeManager,
    systemMcpManager,
    systemSessionCoordinators,
    workspaceManagers,
    mcpManagers,
    sessionCoordinators
  };
  
  // Set up accessors object
  accessors = {
    getWorkspaceManager: (id: string) => workspaceManagers.get(id),
    getMcpManager: (id: string) => mcpManagers.get(id),
    getSessionCoordinator: (workspaceId: string, sessionId: string) => {
      const wsCoordinators = sessionCoordinators.get(workspaceId);
      return wsCoordinators ? wsCoordinators.get(sessionId) : undefined;
    },
    getSessionCoordinatorMap: (workspaceId: string) => {
      return sessionCoordinators.get(workspaceId);
    },
    createSessionCoordinator: (workspaceId: string, sessionId: string, coordinator: any) => {
      let wsCoordinators = sessionCoordinators.get(workspaceId);
      if (!wsCoordinators) {
        wsCoordinators = new Map();
        sessionCoordinators.set(workspaceId, wsCoordinators);
      }
      wsCoordinators.set(sessionId, coordinator);
    },
    removeSessionCoordinator: (workspaceId: string, sessionId: string) => {
      const wsCoordinators = sessionCoordinators.get(workspaceId);
      if (!wsCoordinators) return false;
      return wsCoordinators.delete(sessionId);
    }
  };
  
  // Create test app
  workspaceApp = new Hono();
  workspaceApp.route('/', workspaceManagementRoutes(managers, accessors));
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