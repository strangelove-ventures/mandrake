import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { readdir, mkdir } from 'fs/promises';
import { MandrakeManager } from '../../src/managers/mandrake';
import { createTestDirectory, type TestDirectory } from '../utils/utils';

describe('MandrakeManager', () => {
  let testDir: TestDirectory;
  let manager: MandrakeManager;

  beforeEach(async () => {
    testDir = await createTestDirectory('mandrake-test-');
    manager = new MandrakeManager(testDir.path);
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Initialization', () => {
    test('should create directory structure', async () => {
      await manager.init();

      const dirs = await readdir(manager.paths.root, { withFileTypes: true });
      expect(dirs.some(d => d.isDirectory() && d.name === 'workspaces')).toBe(true);
    });

    test('should create initial configuration', async () => {
      await manager.init();

      const config = await manager.getConfig();
      expect(config).toEqual({
        theme: 'system',
        telemetry: true,
        metadata: {}
      });
    });

    test('should initialize sub-managers with defaults', async () => {
      await manager.init();

      // Check tools
      const tools = await manager.tools.listConfigSets();
      expect(tools).toContain('default');

      // Check models
      const models = await manager.models.getActive();
      expect(models).toBe('');
      const providers = await manager.models.listProviders();
      expect(Object.keys(providers)).toHaveLength(0);

      // Check prompt
      const prompt = await manager.prompt.get();
      expect(prompt).toBe('You are a helpful AI assistant.');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should update config', async () => {
      await manager.updateConfig({
        theme: 'dark',
        telemetry: false,
        metadata: { lastAccess: 'today' }
      });

      const config = await manager.getConfig();
      expect(config.theme).toBe('dark');
      expect(config.telemetry).toBe(false);
      expect(config.metadata.lastAccess).toBe('today');
    });

    test('should persist config across instances', async () => {
      await manager.updateConfig({
        theme: 'dark',
        metadata: { lastAccess: 'today' }
      });

      // Create new instance
      const newManager = new MandrakeManager(testDir.path);
      const config = await newManager.getConfig();
      expect(config.theme).toBe('dark');
      expect(config.metadata.lastAccess).toBe('today');
    });
  });

  describe('Workspace Management', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should list no workspaces initially', async () => {
      const workspaces = await manager.listWorkspaces();
      expect(workspaces).toEqual([]);
    });

    test('should create workspace', async () => {
      const workspace = await manager.createWorkspace('test-workspace', 'Test Description');
      expect(workspace).toBeDefined();

      const config = await workspace.getConfig();
      expect(config.name).toBe('test-workspace');
      expect(config.description).toBe('Test Description');

      const workspaces = await manager.listWorkspaces();
      expect(workspaces).toEqual(['test-workspace']);
    });

    test('should prevent duplicate workspace names', async () => {
      await manager.createWorkspace('test-workspace');
      await expect(manager.createWorkspace('test-workspace'))
        .rejects.toThrow();
    });

    test('should get existing workspace', async () => {
      await manager.createWorkspace('test-workspace');
      const workspace = await manager.getWorkspace('test-workspace');
      expect(workspace).toBeDefined();

      const config = await workspace.getConfig();
      expect(config.name).toBe('test-workspace');
    });

    test('should fail to get non-existent workspace', async () => {
      await expect(manager.getWorkspace('non-existent'))
        .rejects.toThrow();
    });

    test('should delete workspace', async () => {
      await manager.createWorkspace('test-workspace');
      await manager.deleteWorkspace('test-workspace');

      const workspaces = await manager.listWorkspaces();
      expect(workspaces).toEqual([]);
    });

    test('should validate workspace names', async () => {
      // Invalid characters
      await expect(manager.createWorkspace('test workspace'))
        .rejects.toThrow();

      // Empty name
      await expect(manager.createWorkspace(''))
        .rejects.toThrow();
    });

    test('should handle multiple workspaces', async () => {
      await manager.createWorkspace('workspace1');
      await manager.createWorkspace('workspace2');
      await manager.createWorkspace('workspace3');

      const workspaces = await manager.listWorkspaces();
      expect(workspaces).toHaveLength(3);
      expect(workspaces).toContain('workspace1');
      expect(workspaces).toContain('workspace2');
      expect(workspaces).toContain('workspace3');
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted config', async () => {
      await manager.init();
      await Bun.write(manager.paths.config, 'invalid json');

      // Should reset to defaults
      const config = await manager.getConfig();
      expect(config).toEqual({
        theme: 'system',
        telemetry: true,
        metadata: {}
      });
    });

    test('should handle pre-existing workspaces directory', async () => {
      // Create workspaces directory before initialization
      await mkdir(join(testDir.path, 'workspaces'), { recursive: true });
      await manager.init();

      // Should still work
      await manager.createWorkspace('test-workspace');
      const workspaces = await manager.listWorkspaces();
      expect(workspaces).toEqual(['test-workspace']);
    });
  });
});