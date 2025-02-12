import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { WorkspaceManager } from '../../src/managers/workspace';
import { createTestDirectory, type TestDirectory } from '../utils';

describe('WorkspaceManager', () => {
  let testDir: TestDirectory;
  let workspaceManager: WorkspaceManager;
  const workspaceName = 'test-workspace';

  beforeEach(async () => {
    testDir = await createTestDirectory('workspace-test-');
    workspaceManager = new WorkspaceManager(testDir.path, workspaceName);
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Initialization', () => {
    test('should create workspace directory structure', async () => {
      await workspaceManager.init('Test workspace description');

      // Check directory structure
      const paths = workspaceManager.paths;
      const dirs = await readdir(paths.root, { withFileTypes: true });
      
      // Check required directories exist
      expect(dirs.some(d => d.isDirectory() && d.name === 'config')).toBe(true);
      expect(dirs.some(d => d.isDirectory() && d.name === 'files')).toBe(true);
      expect(dirs.some(d => d.isDirectory() && d.name === 'src')).toBe(true);
      expect(dirs.some(d => d.isDirectory() && d.name === 'mcpdata')).toBe(true);
    });

    test('should create initial workspace config', async () => {
      const description = 'Test workspace description';
      await workspaceManager.init(description);

      const config = await workspaceManager.getConfig();
      expect(config.name).toBe(workspaceName);
      expect(config.description).toBe(description);
      expect(config.id).toBeDefined();
      expect(config.created).toBeDefined();
      expect(config.metadata).toEqual({});
    });

    test('should initialize sub-managers with defaults', async () => {
      await workspaceManager.init();

      // Check tools
      const tools = await workspaceManager.tools.list();
      expect(tools).toEqual([]);

      // Check models
      const models = await workspaceManager.models.get();
      expect(models).toEqual({
        provider: '',
        maxTokens: 16000,
        temperature: 0.7
      });

      // Check prompt
      const prompt = await workspaceManager.prompt.get();
      expect(prompt).toBe('You are a helpful AI assistant.');

      // Check dynamic context
      const contexts = await workspaceManager.dynamic.list();
      expect(contexts).toEqual([]);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await workspaceManager.init('Test workspace');
    });

    test('should update workspace config', async () => {
      const updates = {
        description: 'Updated description',
        metadata: { key: 'value' }
      };

      await workspaceManager.updateConfig(updates);
      const config = await workspaceManager.getConfig();

      expect(config.description).toBe(updates.description);
      expect(config.metadata).toEqual(updates.metadata);
    });

    test('should persist changes across instances', async () => {
      const updates = {
        description: 'Updated description',
        metadata: { key: 'value' }
      };

      await workspaceManager.updateConfig(updates);

      // Create new instance
      const newManager = new WorkspaceManager(testDir.path, workspaceName);
      const config = await newManager.getConfig();

      expect(config.description).toBe(updates.description);
      expect(config.metadata).toEqual(updates.metadata);
    });
  });

  describe('Sub-manager Integration', () => {
    beforeEach(async () => {
      await workspaceManager.init();
    });

    test('tools manager should operate independently', async () => {
      await workspaceManager.tools.add({
        id: 'test-tool',
        name: 'Test Tool',
        image: 'test:latest'
      });

      const tools = await workspaceManager.tools.list();
      expect(tools).toHaveLength(1);
    });

    test('models manager should operate independently', async () => {
      await workspaceManager.models.update({
        provider: 'test-provider',
        temperature: 0.5
      });

      const models = await workspaceManager.models.get();
      expect(models.provider).toBe('test-provider');
      expect(models.temperature).toBe(0.5);
    });

    test('prompt manager should operate independently', async () => {
      const newPrompt = 'Custom system prompt';
      await workspaceManager.prompt.update(newPrompt);

      const prompt = await workspaceManager.prompt.get();
      expect(prompt).toBe(newPrompt);
    });

    test('dynamic context manager should operate independently', async () => {
      const contextId = await workspaceManager.dynamic.create({
        serverId: 'test-server',
        methodName: 'test-method',
        params: {},
        refresh: { enabled: true }
      });

      const contexts = await workspaceManager.dynamic.list();
      expect(contexts).toHaveLength(1);
      expect(contexts[0].id).toBe(contextId);
    });
  });

  describe('Error Handling', () => {
    test('should fail to get config before initialization', async () => {
      await expect(workspaceManager.getConfig()).rejects.toThrow();
    });

    test('should handle corrupted workspace config', async () => {
      await workspaceManager.init();
      
      // Corrupt the workspace config
      await Bun.write(workspaceManager.paths.workspace, 'invalid json');

      // Should fail to read corrupted config
      await expect(workspaceManager.getConfig()).rejects.toThrow();
    });
  });
});