import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { sessionDatabaseRoutes } from '../../src/routes/sessions';
import type { Managers, ManagerAccessors } from '../../src/types';

// Setup for testing
let tempDir: string;
let mandrakeManager: MandrakeManager;
let workspaceManager: WorkspaceManager;
let systemSessionsApp: Hono;
let workspaceSessionsApp: Hono;
let workspaceId: string;
let managers: Managers;
let accessors: ManagerAccessors;

// Maps for storage
const workspaceManagers = new Map();
const mcpManagers = new Map();
const sessionCoordinators = new Map();
const systemSessionCoordinators = new Map();

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'sessions-routes-test-'));
  
  // Initialize a real MandrakeManager for system level
  mandrakeManager = new MandrakeManager(tempDir);
  await mandrakeManager.init();
  
  // Initialize a real MCPManager for system level
  const systemMcpManager = new MCPManager();
  
  // Initialize workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize a real WorkspaceManager for workspace level
  workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
  await workspaceManager.init('Test workspace');
  
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
  
  // Store the workspace manager in the map
  workspaceManagers.set(workspaceId, workspaceManager);
  
  // Create session apps
  systemSessionsApp = new Hono();
  systemSessionsApp.route('/', sessionDatabaseRoutes(managers, accessors, true));
  
  workspaceSessionsApp = new Hono();
  workspaceSessionsApp.route('/', sessionDatabaseRoutes(managers, accessors, false, workspaceId));
});

afterAll(async () => {
  // Clean up
  await rm(tempDir, { recursive: true, force: true });
});

// System sessions tests
test('System Sessions - GET / returns empty sessions list initially', async () => {
  const res = await systemSessionsApp.request('/');
  expect(res.status).toBe(200);
  
  const sessions = await res.json();
  expect(Array.isArray(sessions)).toBe(true);
  expect(sessions.length).toBe(0);
});

test('System Sessions - POST / creates a new session', async () => {
  const sessionData = {
    title: 'Test Session',
    description: 'A test session',
    metadata: { key: 'value' }
  };
  
  const res = await systemSessionsApp.request('/', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
  
  expect(res.status).toBe(201);
  const createdSession = await res.json();
  
  expect(createdSession).toHaveProperty('id');
  expect(createdSession).toHaveProperty('title', 'Test Session');
  expect(createdSession).toHaveProperty('description', 'A test session');
  expect(createdSession).toHaveProperty('metadata');
  expect(createdSession.metadata).toHaveProperty('key', 'value');
  
  // Store session ID for later tests
  const sessionId = createdSession.id;
  
  // Also test listing sessions after creation
  const listRes = await systemSessionsApp.request('/');
  const sessions = await listRes.json();
  expect(sessions.length).toBe(1);
  expect(sessions[0]).toHaveProperty('id', sessionId);
  
  // Test GET /:sessionId
  const getRes = await systemSessionsApp.request(`/${sessionId}`);
  expect(getRes.status).toBe(200);
  
  const session = await getRes.json();
  expect(session).toHaveProperty('id', sessionId);
  expect(session).toHaveProperty('title', 'Test Session');
  
  // Test PUT /:sessionId
  const updateData = {
    title: 'Updated Session',
    description: 'An updated test session'
  };
  
  const updateRes = await systemSessionsApp.request(`/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await systemSessionsApp.request(`/${sessionId}`);
  const updatedSession = await verifyRes.json();
  expect(updatedSession).toHaveProperty('title', 'Updated Session');
  expect(updatedSession).toHaveProperty('description', 'An updated test session');
});

test('System Sessions - GET /:sessionId returns 404 for non-existent session', async () => {
  const res = await systemSessionsApp.request('/non-existent-id');
  expect(res.status).toBe(404);
  
  const error = await res.json();
  expect(error).toHaveProperty('error');
  expect(error.error).toContain('not found');
});

test('System Sessions - Create and get session history', async () => {
  // First create a session
  const sessionData = {
    title: 'History Test Session'
  };
  
  const createRes = await systemSessionsApp.request('/', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
  
  const createdSession = await createRes.json();
  const sessionId = createdSession.id;
  
  // Create a round
  const roundData = {
    content: 'Test request content'
  };
  
  const roundRes = await systemSessionsApp.request(`/${sessionId}/rounds`, {
    method: 'POST',
    body: JSON.stringify(roundData)
  });
  
  expect(roundRes.status).toBe(201);
  const round = await roundRes.json();
  
  // Verify round was created with request and response
  expect(round).toHaveProperty('round');
  expect(round).toHaveProperty('request');
  expect(round).toHaveProperty('response');
  
  // Get session history
  const historyRes = await systemSessionsApp.request(`/${sessionId}/history`);
  expect(historyRes.status).toBe(200);
  
  const history = await historyRes.json();
  expect(history).toHaveProperty('session');
  expect(history).toHaveProperty('rounds');
  expect(history.session.id).toBe(sessionId);
  expect(history.rounds.length).toBe(1);
});

test('System Sessions - DELETE /:sessionId deletes a session', async () => {
  // First create a session to delete
  const sessionData = {
    title: 'Session to Delete'
  };
  
  const createRes = await systemSessionsApp.request('/', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
  
  const createdSession = await createRes.json();
  const sessionId = createdSession.id;
  
  // Delete the session
  const deleteRes = await systemSessionsApp.request(`/${sessionId}`, {
    method: 'DELETE'
  });
  
  expect(deleteRes.status).toBe(200);
  
  // Verify the deletion
  const verifyRes = await systemSessionsApp.request(`/${sessionId}`);
  expect(verifyRes.status).toBe(404);
});

// Workspace sessions tests
test('Workspace Sessions - GET / returns empty sessions list initially', async () => {
  const res = await workspaceSessionsApp.request('/');
  expect(res.status).toBe(200);
  
  const sessions = await res.json();
  expect(Array.isArray(sessions)).toBe(true);
  expect(sessions.length).toBe(0);
});

test('Workspace Sessions - POST / creates a new session', async () => {
  const sessionData = {
    title: 'Workspace Session',
    description: 'A workspace test session'
  };
  
  const res = await workspaceSessionsApp.request('/', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
  
  expect(res.status).toBe(201);
  const createdSession = await res.json();
  
  expect(createdSession).toHaveProperty('id');
  expect(createdSession).toHaveProperty('title', 'Workspace Session');
  expect(createdSession).toHaveProperty('description', 'A workspace test session');
  
  // Store session ID for later tests
  const sessionId = createdSession.id;
  
  // Test GET /:sessionId
  const getRes = await workspaceSessionsApp.request(`/${sessionId}`);
  expect(getRes.status).toBe(200);
  
  const session = await getRes.json();
  expect(session).toHaveProperty('id', sessionId);
  expect(session).toHaveProperty('title', 'Workspace Session');
});

test('Workspace Sessions - Can handle errors', async () => {
  // Test roundId that doesn't exist
  const badRoundRes = await workspaceSessionsApp.request('/some-session-id/rounds/non-existent-round');
  expect(badRoundRes.status).toBe(404);
  
  // Test turnId that doesn't exist
  const badTurnRes = await workspaceSessionsApp.request('/turns/non-existent-turn');
  expect(badTurnRes.status).toBe(404);
  
  // Test invalid content for round creation
  const badRoundData = {
    // Missing content
  };
  
  const createRes = await workspaceSessionsApp.request('/some-session-id/rounds', {
    method: 'POST',
    body: JSON.stringify(badRoundData)
  });
  
  expect(createRes.status).toBe(400);
});