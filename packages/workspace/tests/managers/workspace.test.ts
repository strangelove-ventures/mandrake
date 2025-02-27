import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { readdir } from 'fs/promises';
import { WorkspaceManager } from '../../src/managers/workspace';
import { createTestDirectory, type TestDirectory } from '../utils/utils';

describe('WorkspaceManager', () => {
  let testDir: TestDirectory;
  let workspaceManager: WorkspaceManager;
  const workspaceName = 'test-workspace';
  const workspaceId = crypto.randomUUID();

  beforeEach(async () => {
    testDir = await createTestDirectory('workspace-test-');
    workspaceManager = new WorkspaceManager(testDir.path, workspaceName, workspaceId);
    await workspaceManager.init();
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Directory Structure', () => {
    test('should create correct workspace directory structure', async () => {
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
  });

  describe('Component Integration', () => {
    test('should initialize all sub-managers', async () => {
      // Verify all components are accessible and initialized
      expect(workspaceManager.tools).toBeDefined();
      expect(workspaceManager.models).toBeDefined();
      expect(workspaceManager.prompt).toBeDefined();
      expect(workspaceManager.dynamic).toBeDefined();
      expect(workspaceManager.files).toBeDefined();
      expect(workspaceManager.sessions).toBeDefined();
      expect(workspaceManager.config).toBeDefined();

      // Check config contains expected properties
      const config = await workspaceManager.config.getConfig();
      expect(config.id).toBe(workspaceId);
      expect(config.name).toBe(workspaceName);
    });

    test('should maintain consistent workspace ID across components', async () => {
      // Verify the ID from constructor is passed to config
      const config = await workspaceManager.config.getConfig();
      expect(config.id).toBe(workspaceId);

      // Verify ID is exposed as manager property
      expect(workspaceManager.id).toBe(workspaceId);
    });
  });

  describe('End-to-end Workflows', () => {
    test('should support session creation with tools', async () => {
      // Define a custom tool
      const toolConfigSet = {
        test: {
          command: 'test-command',
          args: ['--test']
        }
      };

      // Add tool config
      await workspaceManager.tools.addConfigSet('custom', toolConfigSet);

      // Create a session 
      const session = await workspaceManager.sessions.createSession({
        title: 'Test Session'
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();

      // Verify the session was created in the correct workspace
      const sessions = await workspaceManager.sessions.listSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.some(s => s.id === session.id)).toBe(true);
    });

    test('should support model configuration and context management', async () => {
      // Add a custom model provider
      await workspaceManager.models.addProvider('test-provider', {
        type: 'anthropic',
        apiKey: 'test-key'
      });

      // Create a dynamic context
      const contextId = await workspaceManager.dynamic.create({
        serverId: 'git',
        methodName: 'status',
        params: {},
        refresh: { enabled: true }
      });

      // Verify context was created
      const contexts = await workspaceManager.dynamic.list();
      expect(contexts).toHaveLength(1);
      expect(contexts[0].id).toBe(contextId);

      // Verify model provider was added
      const providers = await workspaceManager.models.listProviders();
      expect(providers['test-provider']).toBeDefined();
    });
  });

  describe('Idempotency', () => {
    test('should be idempotent when calling init multiple times', async () => {
      // Get initial config state
      const initialConfig = await workspaceManager.config.getConfig();

      // Call init again
      await workspaceManager.init('New description');

      // Verify config hasn't changed unexpectedly
      const newConfig = await workspaceManager.config.getConfig();
      expect(newConfig.id).toBe(initialConfig.id);
      expect(newConfig.name).toBe(initialConfig.name);

      // Description shouldn't change since we already initialized
      expect(newConfig.description).toBe(initialConfig.description as string);
    });
  });
});