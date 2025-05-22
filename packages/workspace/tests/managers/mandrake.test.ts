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
    await manager.init();
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Directory Structure', () => {
    test('should create correct directory structure', async () => {
      const dirs = await readdir(manager.paths.root, { withFileTypes: true });
      expect(dirs.some(d => d.isDirectory() && d.name === 'workspaces')).toBe(true);
    });
  });

  describe('Component Integration', () => {
    test('should have all sub-managers properly initialized', async () => {
      // Check that sub-managers are available
      expect(manager.config).toBeDefined();
      expect(manager.tools).toBeDefined();
      expect(manager.models).toBeDefined();
      expect(manager.prompt).toBeDefined();
      expect(manager.sessions).toBeDefined();

      // Verify basic functionality
      const toolConfigs = await manager.tools.listConfigSets();
      expect(toolConfigs).toContain('default');

      const modelName = await manager.models.getActive();
      expect(modelName).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('Workspace Management', () => {
    test('should create and retrieve workspaces by ID', async () => {
      // Create workspace
      const workspace = await manager.createWorkspace('test-workspace', 'Test Description');
      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();

      const workspaceId = workspace.id;

      // Get workspace by ID
      const retrievedWs = await manager.getWorkspace(workspaceId);
      expect(retrievedWs).toBeDefined();
      expect(retrievedWs.id).toBe(workspaceId);
      expect(retrievedWs.name).toBe('test-workspace');
    });

    test('should create workspace with custom path', async () => {
      // Create a subdirectory for the custom workspace
      const customDir = join(testDir.path, 'custom');
      await mkdir(customDir, { recursive: true });

      // Create workspace at custom path
      const parentPath = join(customDir, 'custom-ws');
      const workspace = await manager.createWorkspace('custom-workspace', 'Custom workspace', parentPath);

      // The workspace should be available
      const workspaces = await manager.listWorkspaces();
      expect(workspaces.some(ws => ws.name === 'custom-workspace')).toBe(true);

      // Workspace should be at the parent path + workspace name
      const customWorkspace = workspaces.find(ws => ws.name === 'custom-workspace');
      expect(customWorkspace?.path).toBe(join(parentPath, 'custom-workspace'));
    });

    test('should prevent duplicate workspace names', async () => {
      await manager.createWorkspace('test-workspace');
      await expect(manager.createWorkspace('test-workspace'))
        .rejects.toThrow();
    });

    test('should delete workspaces by ID', async () => {
      // Create workspace
      const workspace = await manager.createWorkspace('delete-test');
      const workspaceId = workspace.id;

      // Delete by ID
      await manager.deleteWorkspace(workspaceId);

      // Should no longer be in the list
      const workspaces = await manager.listWorkspaces();
      expect(workspaces.some(ws => ws.id === workspaceId)).toBe(false);
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

      const workspaceNames = workspaces.map(ws => ws.name);
      expect(workspaceNames).toContain('workspace1');
      expect(workspaceNames).toContain('workspace2');
      expect(workspaceNames).toContain('workspace3');
    });
  });

  describe('Cross-Component Workflows', () => {
    test('should create workspaces with properly initialized sub-components', async () => {
      // Create a workspace
      const workspace = await manager.createWorkspace('integrated-test');

      // Verify all components are initialized
      expect(workspace.config).toBeDefined();
      expect(workspace.tools).toBeDefined();
      expect(workspace.models).toBeDefined();
      expect(workspace.prompt).toBeDefined();
      expect(workspace.dynamic).toBeDefined();
      expect(workspace.files).toBeDefined();
      expect(workspace.sessions).toBeDefined();

      // Check basic functionality
      const tools = await workspace.tools.listConfigSets();
      expect(tools).toContain('default');

      const active = await workspace.models.getActive();
      expect(active).toBe('claude-3-5-sonnet-20241022');
    });
  });
});