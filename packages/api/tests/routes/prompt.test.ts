import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { promptRoutes } from '../../src/routes/prompt';

// Setup for testing
let tempDir: string;
let mandrakeManager: MandrakeManager;
let workspaceManager: WorkspaceManager;
let systemPromptApp: Hono;
let workspacePromptApp: Hono;
let workspaceId: string;

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'prompt-routes-test-'));
  
  // Initialize a real MandrakeManager for system level
  mandrakeManager = new MandrakeManager(tempDir);
  await mandrakeManager.init();
  
  // Initialize workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize a real WorkspaceManager for workspace level
  workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
  await workspaceManager.init('Test workspace');
  
  // Create prompt apps
  systemPromptApp = new Hono();
  systemPromptApp.route('/', promptRoutes(mandrakeManager.prompt));
  
  workspacePromptApp = new Hono();
  workspacePromptApp.route('/', promptRoutes(workspaceManager.prompt));
});

afterAll(async () => {
  // Clean up
  await rm(tempDir, { recursive: true, force: true });
});

// System prompt tests
test('System prompt - GET / returns prompt configuration', async () => {
  const res = await systemPromptApp.request('/');
  expect(res.status).toBe(200);
  
  const config = await res.json();
  expect(config).toHaveProperty('system');
  expect(config).toHaveProperty('dateFormat');
  expect(config).toHaveProperty('metadata');
});

test('System prompt - PUT / updates prompt configuration', async () => {
  // Get current config
  const getRes = await systemPromptApp.request('/');
  const currentConfig = await getRes.json();
  
  // Update the system prompt
  const updatedConfig = {
    ...currentConfig,
    system: 'You are a helpful assistant. Please respond concisely.'
  };
  
  // Update config
  const updateRes = await systemPromptApp.request('/', {
    method: 'PUT',
    body: JSON.stringify(updatedConfig)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await systemPromptApp.request('/');
  const config = await verifyRes.json();
  expect(config).toHaveProperty('system', 'You are a helpful assistant. Please respond concisely.');
});

// Workspace prompt tests
test('Workspace prompt - GET / returns prompt configuration', async () => {
  const res = await workspacePromptApp.request('/');
  expect(res.status).toBe(200);
  
  const config = await res.json();
  expect(config).toHaveProperty('system');
  expect(config).toHaveProperty('dateFormat');
  expect(config).toHaveProperty('metadata');
});

test('Workspace prompt - PUT / updates prompt configuration', async () => {
  // Get current config
  const getRes = await workspacePromptApp.request('/');
  const currentConfig = await getRes.json();
  
  // Update the system prompt
  const updatedConfig = {
    ...currentConfig,
    system: 'You are working in a test workspace. Be precise and helpful.'
  };
  
  // Update config
  const updateRes = await workspacePromptApp.request('/', {
    method: 'PUT',
    body: JSON.stringify(updatedConfig)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await workspacePromptApp.request('/');
  const config = await verifyRes.json();
  expect(config).toHaveProperty('system', 'You are working in a test workspace. Be precise and helpful.');
});