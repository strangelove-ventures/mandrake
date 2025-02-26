import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { WorkspaceManager } from '../../src/managers/workspace';
import { createTestDirectory, type TestDirectory } from '../utils/utils';

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
      expect(dirs.some(d => d.isDirectory() && d.name === '.ws')).toBe(true);

      const wsDirs = await readdir(join(paths.root, '.ws'), { withFileTypes: true });
      expect(wsDirs.some(d => d.isDirectory() && d.name === 'config')).toBe(true);
      expect(wsDirs.some(d => d.isDirectory() && d.name === 'files')).toBe(true);
      expect(wsDirs.some(d => d.isDirectory() && d.name === 'mcpdata')).toBe(true);
      
      // Check workspace.json is in the config directory
      const configDirs = await readdir(join(paths.root, '.ws', 'config'), { withFileTypes: true });
      expect(configDirs.some(f => f.isFile() && f.name === 'workspace.json')).toBe(true);
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
      const tools = await workspaceManager.tools.listConfigSets();
      expect(tools).toContain('default');

      // Check models
      const models = await workspaceManager.models.getActive();
      expect(models).toBe('claude-3-5-sonnet-20241022');
      const providers = await workspaceManager.models.listProviders();
      expect(Object.keys(providers)).toHaveLength(1);

      // Rest stays the same
      const prompt = await workspaceManager.prompt.getConfig();
      expect(prompt.instructions).toContain('Mandrake');

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
      const config = {
        test: {
          command: 'test-command'
        }
      };
      await workspaceManager.tools.addConfigSet('test', config);

      const configs = await workspaceManager.tools.listConfigSets();
      expect(configs).toContain('test');
    });

    test('models manager should operate independently', async () => {
      const provider = {
        type: 'anthropic' as const,
        apiKey: 'test-key'
      };
      await workspaceManager.models.addProvider('test', provider);

      const providers = await workspaceManager.models.listProviders();
      expect(Object.keys(providers)).toContain('test');
    });

    test('prompt manager should operate independently', async () => {
      const newPrompt = 'Custom system prompt';
      await workspaceManager.prompt.updateConfig({
        instructions: newPrompt,
        includeWorkspaceMetadata: false,
        includeSystemInfo: false,
        includeDateTime: false
      });

      const prompt = await workspaceManager.prompt.getConfig();
      expect(prompt.instructions).toBe(newPrompt);
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
      await Bun.write(join(workspaceManager.paths.root, '.ws', 'config', 'workspace.json'), 'invalid json');

      // Should fail to read corrupted config
      await expect(workspaceManager.getConfig()).rejects.toThrow();
    });
  });
});