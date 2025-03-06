import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { WorkspaceManager } from '@mandrake/workspace';
import { dynamicContextRoutes } from '../../src/routes/dynamic';

// Setup for testing
let tempDir: string;
let workspaceManager: WorkspaceManager;
let dynamicApp: Hono;
let workspaceId: string;

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'dynamic-routes-test-'));
  
  // Initialize workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize a real WorkspaceManager
  workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
  await workspaceManager.init('Test workspace');
  
  // Create dynamic app
  dynamicApp = new Hono();
  dynamicApp.route('/', dynamicContextRoutes(workspaceManager.dynamic));
});

afterAll(async () => {
  // Clean up
  await rm(tempDir, { recursive: true, force: true });
});

// Test cases
test('Dynamic routes - GET / returns empty dynamic methods list initially', async () => {
  const res = await dynamicApp.request('/');
  expect(res.status).toBe(200);
  
  const methods = await res.json();
  expect(Array.isArray(methods)).toBe(true);
  expect(methods.length).toBe(0);
});

test('Dynamic routes - POST / creates a new dynamic method', async () => {
  // Create method data that conforms to the DynamicContextMethodSchema
  const methodData = {
    serverId: 'test-server',
    methodName: 'test-method',
    params: {
      input: 'test input'
    },
    refresh: {
      enabled: true,
      interval: '1h',
      onDemand: true
    }
  };
  
  const res = await dynamicApp.request('/', {
    method: 'POST',
    body: JSON.stringify(methodData)
  });
  
  expect(res.status).toBe(201);
  const createdMethod = await res.json();
  
  expect(createdMethod).toHaveProperty('success', true);
  expect(createdMethod).toHaveProperty('id');
  
  // Store method ID for later tests
  const methodId = createdMethod.id;
  
  // Also test listing methods after creation
  const listRes = await dynamicApp.request('/');
  const methods = await listRes.json();
  expect(methods.length).toBe(1);
  expect(methods[0]).toHaveProperty('id', methodId);
  expect(methods[0]).toHaveProperty('serverId', 'test-server');
  expect(methods[0]).toHaveProperty('methodName', 'test-method');
  
  // Test GET /:methodId
  const getRes = await dynamicApp.request(`/${methodId}`);
  expect(getRes.status).toBe(200);
  
  const method = await getRes.json();
  expect(method).toHaveProperty('id', methodId);
  expect(method).toHaveProperty('methodName', 'test-method');
  
  // Test PUT /:methodId
  const updateData = {
    ...method,
    methodName: 'updated-method'
  };
  
  const updateRes = await dynamicApp.request(`/${methodId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await dynamicApp.request(`/${methodId}`);
  const updatedMethod = await verifyRes.json();
  expect(updatedMethod).toHaveProperty('methodName', 'updated-method');
  
  // Test PATCH /:methodId/refresh (toggle enabled status)
  const patchRes = await dynamicApp.request(`/${methodId}/refresh`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: false })
  });
  
  expect(patchRes.status).toBe(200);
  
  // Verify the status update
  const statusRes = await dynamicApp.request(`/${methodId}`);
  const statusMethod = await statusRes.json();
  expect(statusMethod.refresh.enabled).toBe(false);
  
  // Test DELETE /:methodId
  const deleteRes = await dynamicApp.request(`/${methodId}`, {
    method: 'DELETE'
  });
  
  expect(deleteRes.status).toBe(200);
  
  // Verify the deletion
  const finalListRes = await dynamicApp.request('/');
  const finalMethods = await finalListRes.json();
  expect(finalMethods.length).toBe(0);
});

test('Dynamic routes - GET /:methodId returns 404 for non-existent method', async () => {
  const res = await dynamicApp.request('/non-existent-id');
  expect(res.status).toBe(404);
  
  const error = await res.json();
  expect(error).toHaveProperty('error');
});