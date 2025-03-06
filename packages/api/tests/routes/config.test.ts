import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MandrakeConfigManager, WorkspaceConfigManager } from '@mandrake/workspace';
import { mandrakeConfigRoutes, workspaceConfigRoutes } from '../../src/routes/config';

// Setup for testing
let tempDir: string;
let mandrakeConfigManager: MandrakeConfigManager;
let workspaceConfigManager: WorkspaceConfigManager;
let workspaceId: string;

// App instances
let systemConfigApp: Hono;
let workspaceConfigApp: Hono;

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'config-routes-test-'));
  
  // Create config directories
  const configPath = join(tempDir, 'mandrake.json');
  const wsConfigPath = join(tempDir, 'workspace.json');
  
  // Initialize the workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize config managers
  mandrakeConfigManager = new MandrakeConfigManager(configPath);
  await mandrakeConfigManager.init();
  
  // Initialize workspace config manager
  workspaceConfigManager = new WorkspaceConfigManager(wsConfigPath, workspaceId, 'test-workspace');
  await workspaceConfigManager.init('Test workspace description');
  
  // Register the workspace with the mandrake config
  const config = await mandrakeConfigManager.getConfig();
  config.workspaces = [
    {
      id: workspaceId,
      name: 'test-workspace',
      path: join(tempDir, 'workspaces', 'test-workspace'),
      description: 'Test workspace description',
      lastOpened: new Date().toISOString()
    }
  ];
  await mandrakeConfigManager.updateConfig(config);
  
  // Create test apps
  systemConfigApp = new Hono();
  systemConfigApp.route('/', mandrakeConfigRoutes(mandrakeConfigManager));
  
  workspaceConfigApp = new Hono();
  workspaceConfigApp.route('/', workspaceConfigRoutes(workspaceConfigManager));
});

afterAll(async () => {
  // Clean up
  await rm(tempDir, { recursive: true, force: true });
});

// System config tests
test('System config - GET / returns system configuration', async () => {
  const res = await systemConfigApp.request('/');
  expect(res.status).toBe(200);
  
  const config = await res.json();
  expect(config).toHaveProperty('workspaces');
  expect(config).toHaveProperty('theme');
  expect(config).toHaveProperty('telemetry');
  expect(config).toHaveProperty('metadata');
  
  // Check workspace data
  const workspaces = config.workspaces;
  expect(Array.isArray(workspaces)).toBe(true);
  expect(workspaces.length).toBe(1);
  
  const testWorkspace = workspaces[0];
  expect(testWorkspace).toHaveProperty('id', workspaceId);
  expect(testWorkspace).toHaveProperty('name', 'test-workspace');
  expect(testWorkspace).toHaveProperty('description', 'Test workspace description');
});

test('System config - PUT / updates system configuration', async () => {
  // Get current config
  const getRes = await systemConfigApp.request('/');
  const currentConfig = await getRes.json();
  
  // Update the description of the workspace
  const updatedConfig = {
    ...currentConfig,
    workspaces: [
      {
        ...currentConfig.workspaces[0],
        description: 'Updated workspace description'
      }
    ]
  };
  
  // Update config
  const updateRes = await systemConfigApp.request('/', {
    method: 'PUT',
    body: JSON.stringify(updatedConfig)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await systemConfigApp.request('/');
  const config = await verifyRes.json();
  expect(config.workspaces[0]).toHaveProperty('description', 'Updated workspace description');
});

// Workspace config tests
test('Workspace config - GET / returns workspace configuration', async () => {
  const res = await workspaceConfigApp.request('/');
  expect(res.status).toBe(200);
  
  const config = await res.json();
  expect(config).toHaveProperty('id', workspaceId);
  expect(config).toHaveProperty('name', 'test-workspace');
  expect(config).toHaveProperty('description', 'Test workspace description');
  expect(config).toHaveProperty('created');
  expect(config).toHaveProperty('metadata');
});

test('Workspace config - PUT / updates workspace configuration', async () => {
  // Get current config
  const getRes = await workspaceConfigApp.request('/');
  const currentConfig = await getRes.json();
  
  // Update the description
  const updatedConfig = {
    ...currentConfig,
    description: 'Updated workspace description'
  };
  
  // Update config
  const updateRes = await workspaceConfigApp.request('/', {
    method: 'PUT',
    body: JSON.stringify(updatedConfig)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await workspaceConfigApp.request('/');
  const config = await verifyRes.json();
  expect(config).toHaveProperty('description', 'Updated workspace description');
});