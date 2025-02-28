/**
 * Tests for service registry initialization and lifecycle
 */
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { getServiceRegistry } from '../../src/lib/services/registry';
import { createTestDirectory } from '../utils/test-dir';
import { join } from 'path';

describe('Service Registry Lifecycle', () => {
  // Test directory
  let testDir: { path: string; cleanup: () => Promise<void> };
  const originalMandrakeRoot = process.env.MANDRAKE_ROOT;

  // Set up test environment before all tests
  beforeAll(async () => {
    // Create temporary test directory
    testDir = await createTestDirectory();
  });

  // Clean up after all tests
  afterAll(async () => {
    // Restore original environment
    process.env.MANDRAKE_ROOT = originalMandrakeRoot;
    // Clean up test directory
    await testDir.cleanup();
  });

  beforeEach(() => {
    // Set MANDRAKE_ROOT environment variable to test directory
    process.env.MANDRAKE_ROOT = testDir.path;
    console.log(`Using test directory: ${testDir.path}`);

    // Clear module cache to reset singletons
    try {
      delete require.cache[require.resolve('../../src/lib/services/registry')];
    } catch (error) {
      console.warn('Could not reset modules', error);
    }
  });

  afterEach(async () => {
    // Clean up services
    try {
      const registry = getServiceRegistry();
      await registry.performCleanup();
    } catch (error) {
      console.warn('Error during cleanup', error);
    }
  });

  test('should initialize MandrakeManager when requested', async () => {
    // Get registry
    const registry = getServiceRegistry();

    // Access MandrakeManager (should trigger initialization)
    const manager = await registry.getMandrakeManager();

    // Verify it was initialized
    expect(manager).toBeDefined();
    expect(manager.paths.root).toBe(testDir.path);
  });

  test('should cache and reuse MandrakeManager', async () => {
    const registry = getServiceRegistry();

    // Get manager twice
    const manager1 = await registry.getMandrakeManager();
    const manager2 = await registry.getMandrakeManager();

    // Should be same instance
    expect(manager2).toBe(manager1);
  });

  test('should perform cleanup without errors', async () => {
    const registry = getServiceRegistry();

    // Create a spy to check if cleanup completes
    let cleanupCompleted = false;

    // Trigger cleanup
    await registry.performCleanup();
    cleanupCompleted = true;

    // If we got here, no errors were thrown
    expect(cleanupCompleted).toBe(true);
  });

  test('should create and cache workspace manager', async () => {
    const registry = getServiceRegistry();
    const mandrakeManager = await registry.getMandrakeManager();

    // Create a workspace
    const workspace = await mandrakeManager.createWorkspace('test-workspace', 'Test workspace');
    const workspaceId = workspace.id;

    // Get it through registry
    const manager1 = await registry.getWorkspaceManager(workspaceId);
    const manager2 = await registry.getWorkspaceManager(workspaceId);

    // Should be cached
    expect(manager2).toBe(manager1);
    expect(manager1.id).toBe(workspaceId);
  });
});