import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { modelsRoutes, providersRoutes } from '../../src/routes/models';

// Setup for testing
let tempDir: string;
let mandrakeManager: MandrakeManager;
let workspaceManager: WorkspaceManager;
let systemModelsApp: Hono;
let systemProvidersApp: Hono;
let workspaceModelsApp: Hono;
let workspaceProvidersApp: Hono;
let workspaceId: string;

beforeAll(async () => {
  // Create temporary directory
  tempDir = await mkdtemp(join(tmpdir(), 'models-routes-test-'));
  
  // Initialize a real MandrakeManager for system level
  mandrakeManager = new MandrakeManager(tempDir);
  await mandrakeManager.init();
  
  // Initialize workspace ID
  workspaceId = crypto.randomUUID();
  
  // Initialize a real WorkspaceManager for workspace level
  workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
  await workspaceManager.init('Test workspace');
  
  // Create models and providers apps
  systemModelsApp = new Hono();
  systemModelsApp.route('/', modelsRoutes(mandrakeManager.models));
  
  systemProvidersApp = new Hono();
  systemProvidersApp.route('/', providersRoutes(mandrakeManager.models));
  
  workspaceModelsApp = new Hono();
  workspaceModelsApp.route('/', modelsRoutes(workspaceManager.models));
  
  workspaceProvidersApp = new Hono();
  workspaceProvidersApp.route('/', providersRoutes(workspaceManager.models));
});

afterAll(async () => {
  // Clean up
  await rm(tempDir, { recursive: true, force: true });
});

// System models tests
test('System models - GET / returns models configuration', async () => {
  const res = await systemModelsApp.request('/');
  expect(res.status).toBe(200);
  
  const models = await res.json();
  expect(Array.isArray(models)).toBe(true);
  // Initially there should be default models
  expect(models.length).toBeGreaterThan(0);
});

test('System models - GET /active returns active model', async () => {
  const res = await systemModelsApp.request('/active');
  expect(res.status).toBe(200);
  
  const activeModel = await res.json();
  expect(activeModel).toHaveProperty('id');
  expect(activeModel).toHaveProperty('provider');
  expect(activeModel).toHaveProperty('name');
});

test('System models - PUT /active updates active model', async () => {
  // Get existing models
  const modelsRes = await systemModelsApp.request('/');
  const models = await modelsRes.json();
  
  // Use the first available model
  const model = models[0];
  
  // Set it as active
  const updateRes = await systemModelsApp.request('/active', {
    method: 'PUT',
    body: JSON.stringify({ id: model.id })
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await systemModelsApp.request('/active');
  const activeModel = await verifyRes.json();
  expect(activeModel).toHaveProperty('id', model.id);
});

// System providers tests
test('System providers - GET / returns providers list', async () => {
  const res = await systemProvidersApp.request('/');
  expect(res.status).toBe(200);
  
  const providers = await res.json();
  expect(Array.isArray(providers)).toBe(true);
  // Should include at least anthropic, ollama, etc.
  expect(providers.length).toBeGreaterThan(0);
});

test('System providers - GET /:providerId returns provider config', async () => {
  // Get providers list first
  const listRes = await systemProvidersApp.request('/');
  const providers = await listRes.json();
  
  // Use the first available provider
  const provider = providers[0];
  
  // Get this provider's config
  const res = await systemProvidersApp.request(`/${provider.id}`);
  expect(res.status).toBe(200);
  
  const config = await res.json();
  expect(config).toHaveProperty('id', provider.id);
  expect(config).toHaveProperty('name');
  expect(config).toHaveProperty('models');
});

test('System providers - PUT /:providerId updates provider config', async () => {
  // Get providers list first
  const listRes = await systemProvidersApp.request('/');
  const providers = await listRes.json();
  
  // Use the first available provider
  const provider = providers[0];
  
  // Get this provider's config
  const getRes = await systemProvidersApp.request(`/${provider.id}`);
  const config = await getRes.json();
  
  // Update a field that won't break the provider but is supported by the schema
  // For ProviderConfig, we have 'type', 'apiKey', and 'baseUrl' fields
  const updatedConfig = {
    ...config,
    apiKey: 'updated-api-key'
  };
  
  // Update the config
  const updateRes = await systemProvidersApp.request(`/${provider.id}`, {
    method: 'PUT',
    body: JSON.stringify(updatedConfig)
  });
  
  expect(updateRes.status).toBe(200);
  
  // Verify the update
  const verifyRes = await systemProvidersApp.request(`/${provider.id}`);
  const newConfig = await verifyRes.json();
  expect(newConfig).toHaveProperty('apiKey', 'updated-api-key');
});

// Workspace models tests - similar to system but on workspace level
test('Workspace models - GET / returns models configuration', async () => {
  const res = await workspaceModelsApp.request('/');
  expect(res.status).toBe(200);
  
  const models = await res.json();
  expect(Array.isArray(models)).toBe(true);
});

test('Workspace models - GET /active returns active model', async () => {
  const res = await workspaceModelsApp.request('/active');
  expect(res.status).toBe(200);
  
  const activeModel = await res.json();
  expect(activeModel).toHaveProperty('id');
  expect(activeModel).toHaveProperty('provider');
  expect(activeModel).toHaveProperty('name');
});

// Workspace providers tests - similar to system but on workspace level
test('Workspace providers - GET / returns providers list', async () => {
  const res = await workspaceProvidersApp.request('/');
  expect(res.status).toBe(200);
  
  const providers = await res.json();
  expect(Array.isArray(providers)).toBe(true);
  expect(providers.length).toBeGreaterThan(0);
});