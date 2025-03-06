import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { createTestApp, cleanupTestApp } from './utils';

let app: Hono;
let tempDir: string;

beforeAll(async () => {
  const result = await createTestApp();
  app = result.app;
  tempDir = result.tempDir;
});

afterAll(async () => {
  await cleanupTestApp(tempDir);
});

test('API status endpoint returns expected response', async () => {
  const res = await app.request('/');
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data).toHaveProperty('status');
  expect(data.status).toBe('Mandrake API is running');
});

test('System info endpoint returns expected response', async () => {
  const res = await app.request('/system');
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data).toHaveProperty('version');
  expect(data).toHaveProperty('path');
  expect(data).toHaveProperty('workspaces');
});

test('System config endpoint returns configuration', async () => {
  const res = await app.request('/system/config');
  expect(res.status).toBe(200);
});

test('System tools list endpoint returns empty list initially', async () => {
  const res = await app.request('/system/tools/list');
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(Array.isArray(data)).toBe(true);
});

test('System models list endpoint returns models', async () => {
  const res = await app.request('/system/models/list');
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(Array.isArray(data)).toBe(true);
});

test('Can add and retrieve a tool configuration', async () => {
  // Add a tool
  const toolConfig = {
    name: 'test-tool',
    command: 'echo',
    args: ['Hello, World!']
  };
  
  const addRes = await app.request('/system/tools/add', {
    method: 'POST',
    body: JSON.stringify(toolConfig)
  });
  
  expect(addRes.status).toBe(201);
  
  // Get the tool
  const getRes = await app.request('/system/tools/test-tool');
  expect(getRes.status).toBe(200);
  const tool = await getRes.json();
  expect(tool).toHaveProperty('name', 'test-tool');
  expect(tool).toHaveProperty('command', 'echo');
});

test('Can update prompt configuration', async () => {
  // Get current prompt config
  const getRes = await app.request('/system/prompt');
  expect(getRes.status).toBe(200);
  const initialConfig = await getRes.json();
  
  // Update system prompt
  const updateRes = await app.request('/system/prompt/system', {
    method: 'PUT',
    body: JSON.stringify({ system: 'You are a helpful assistant.' })
  });
  
  expect(updateRes.status).toBe(200);
  
  // Get updated config
  const updatedRes = await app.request('/system/prompt');
  expect(updatedRes.status).toBe(200);
  const updatedConfig = await updatedRes.json();
  expect(updatedConfig).toHaveProperty('system', 'You are a helpful assistant.');
});