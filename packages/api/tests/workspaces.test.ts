import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { createTestApp, cleanupTestApp } from './utils';

let app: Hono;
let tempDir: string;
let workspaceId: string;

beforeAll(async () => {
  const result = await createTestApp();
  app = result.app;
  tempDir = result.tempDir;
  
  // Create a test workspace
  const createRes = await app.request('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ 
      name: 'TestWorkspace', 
      description: 'A test workspace',
      path: `${tempDir}/workspaces/test-workspace`
    })
  });
  
  expect(createRes.status).toBe(201);
  const workspace = await createRes.json();
  workspaceId = workspace.id;
  
  // Print the response for debugging
  console.log('Workspace response:', workspace);
});

afterAll(async () => {
  await cleanupTestApp(tempDir);
});

test('Workspace list endpoint returns all workspaces', async () => {
  const res = await app.request('/workspaces');
  expect(res.status).toBe(200);
  const workspaces = await res.json();
  expect(Array.isArray(workspaces)).toBe(true);
  expect(workspaces.length).toBe(1);
  expect(workspaces[0]).toHaveProperty('id', workspaceId);
  expect(workspaces[0]).toHaveProperty('name', 'TestWorkspace');
});

test('Can get workspace info', async () => {
  const res = await app.request(`/workspaces/${workspaceId}`);
  expect(res.status).toBe(200);
  const workspace = await res.json();
  expect(workspace).toHaveProperty('id', workspaceId);
  expect(workspace).toHaveProperty('name', 'TestWorkspace');
  expect(workspace).toHaveProperty('description', 'A test workspace');
});

test('Workspace config endpoint returns configuration', async () => {
  const res = await app.request(`/workspaces/${workspaceId}/config`);
  expect(res.status).toBe(200);
  const config = await res.json();
  expect(config).toHaveProperty('description', 'A test workspace');
});

test('Workspace tools list endpoint returns tools', async () => {
  const res = await app.request(`/workspaces/${workspaceId}/tools/operations`);
  expect(res.status).toBe(200);
  const tools = await res.json();
  expect(Array.isArray(tools)).toBe(true);
});

test('Can add and retrieve a workspace tool configuration', async () => {
  // First create a tool config set
  const configSetRes = await app.request(`/workspaces/${workspaceId}/tools/configs`, {
    method: 'POST',
    body: JSON.stringify({
      id: 'test-tools',
      name: 'TestTools'
    })
  });
  
  expect(configSetRes.status).toBe(201);
  const configSetData = await configSetRes.json();
  const setId = configSetData.id;
  
  // Now we need to use the correct URL structure to get the config
  const getConfigRes = await app.request(`/workspaces/${workspaceId}/tools/configs/${setId}`);
  expect(getConfigRes.status).toBe(200);
});

test('Can create and retrieve a session', async () => {
  // Create a session
  const createRes = await app.request(`/workspaces/${workspaceId}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Test Session' })
  });
  
  expect(createRes.status).toBe(201);
  const session = await createRes.json();
  expect(session).toHaveProperty('id');
  expect(session).toHaveProperty('title', 'Test Session');
  
  const sessionId = session.id;
  
  // Get the session
  const getRes = await app.request(`/workspaces/${workspaceId}/sessions/${sessionId}`);
  expect(getRes.status).toBe(200);
  const retrievedSession = await getRes.json();
  expect(retrievedSession).toHaveProperty('id', sessionId);
});