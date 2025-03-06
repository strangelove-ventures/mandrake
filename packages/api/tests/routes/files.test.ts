import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { WorkspaceManager } from '@mandrake/workspace';
import { filesRoutes } from '../../src/routes/files';

// Setup for testing
let tempDir: string;
let workspaceManager: WorkspaceManager;
let filesApp: Hono;
let workspaceId: string;

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'files-routes-test-'));
  
  // Initialize workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize a real WorkspaceManager
  workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
  await workspaceManager.init('Test workspace');
  
  // Create files app
  filesApp = new Hono();
  filesApp.route('/', filesRoutes(workspaceManager.files));
});

afterAll(async () => {
  // Clean up
  await rm(tempDir, { recursive: true, force: true });
});

// Test cases
test('Files routes - GET / returns empty files list initially', async () => {
  const res = await filesApp.request('/');
  expect(res.status).toBe(200);
  
  const files = await res.json();
  expect(Array.isArray(files)).toBe(true);
  expect(files.length).toBe(0);
});

test('Files routes - POST / creates a new file', async () => {
  const fileData = {
    name: 'test-file.txt',
    content: 'Hello, World!',
    active: true
  };
  
  const res = await filesApp.request('/', {
    method: 'POST',
    body: JSON.stringify(fileData)
  });
  
  expect(res.status).toBe(201);
  const createdFile = await res.json();
  
  expect(createdFile).toHaveProperty('success', true);
  expect(createdFile).toHaveProperty('name', 'test-file.txt');
  
  // Store file name for later tests
  const fileName = 'test-file.txt';
  
  // Also test listing files after creation
  const listRes = await filesApp.request('/');
  const files = await listRes.json();
  expect(files.length).toBe(1);
  expect(files[0]).toHaveProperty('name', fileName);
  
  // Test GET /:fileName
  const getRes = await filesApp.request(`/${fileName}`);
  expect(getRes.status).toBe(200);
  
  const file = await getRes.json();
  expect(file).toHaveProperty('name', fileName);
  expect(file).toHaveProperty('content', 'Hello, World!');
  expect(file).toHaveProperty('active', true);
  
  // Test PUT /:fileName
  const updateData = {
    content: 'Updated content'
  };
  
  const updateRes = await filesApp.request(`/${fileName}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await filesApp.request(`/${fileName}`);
  const updatedFile = await verifyRes.json();
  expect(updatedFile).toHaveProperty('content', 'Updated content');
  
  // Test updating active status
  const activeUpdateData = {
    active: false
  };
  
  const activeRes = await filesApp.request(`/${fileName}`, {
    method: 'PUT',
    body: JSON.stringify(activeUpdateData)
  });
  
  expect(activeRes.status).toBe(200);
  
  // Verify the status update
  const statusRes = await filesApp.request(`/${fileName}`);
  const statusFile = await statusRes.json();
  expect(statusFile).toHaveProperty('active', false);
  
  // Test DELETE /:fileName
  const deleteRes = await filesApp.request(`/${fileName}`, {
    method: 'DELETE'
  });
  
  expect(deleteRes.status).toBe(200);
  
  // Verify the deletion
  const finalListRes = await filesApp.request('/');
  const finalFiles = await finalListRes.json();
  expect(finalFiles.length).toBe(0);
});

test('Files routes - GET /:fileId returns 404 for non-existent file', async () => {
  const res = await filesApp.request('/non-existent-id');
  expect(res.status).toBe(404);
  
  const error = await res.json();
  expect(error).toHaveProperty('error');
});