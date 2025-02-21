import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { dynamicContextTool } from '../../src/tools/dynamic';
import { WorkspaceToolError, WorkspaceToolErrorCode, WorkspaceToolContext } from '../../src/types';
import { createTestWorkspace, cleanupTestWorkspace, createMockWorkspaceManager } from '../utils/test-helpers';

describe('Dynamic Context Tool', () => {
  describe('Unit Tests', () => {
    let mockWorkspace: ReturnType<typeof createMockWorkspaceManager>;
    let context: WorkspaceToolContext;

    beforeEach(() => {
      mockWorkspace = createMockWorkspaceManager();
      context = {
        workspace: mockWorkspace,
        workingDir: '/test',
        allowedDirs: ['/test']
      };
    });

    test('validates required parameters for add action', async () => {
      await expect(dynamicContextTool.execute({
        action: 'add'
      }, context)).rejects.toThrow(WorkspaceToolError);

      await expect(dynamicContextTool.execute({
        action: 'add',
        name: 'test'
      }, context)).rejects.toThrow(WorkspaceToolError);
    });

    test('creates new dynamic context', async () => {
      const result = await dynamicContextTool.execute({
        action: 'add',
        name: 'git-status',
        command: 'git status'
      }, context);

      expect(mockWorkspace.dynamicContextManager.create).toHaveBeenCalledWith({
        name: 'git-status',
        command: 'git status',
        enabled: true
      });
      expect(result.success).toBe(true);
    });

    test('removes dynamic context', async () => {
      const result = await dynamicContextTool.execute({
        action: 'remove',
        name: 'git-status'
      }, context);

      expect(mockWorkspace.dynamicContextManager.delete).toHaveBeenCalledWith('git-status');
      expect(result.success).toBe(true);
    });

    test('updates dynamic context', async () => {
      const result = await dynamicContextTool.execute({
        action: 'update',
        name: 'git-status',
        enabled: false
      }, context);

      expect(mockWorkspace.dynamicContextManager.update).toHaveBeenCalledWith(
        'git-status',
        { enabled: false }
      );
      expect(result.success).toBe(true);
    });

    test('lists dynamic contexts', async () => {
      const mockContexts = [
        { name: 'git-status', command: 'git status', enabled: true }
      ];
      mockWorkspace.dynamicContextManager.list.mockResolvedValue(mockContexts);

      const result = await dynamicContextTool.execute({
        action: 'list'
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContexts);
    });
  });

  describe('Integration Tests', () => {
    let workspace: any;
    let context: WorkspaceToolContext;
    let testDir: string;

    beforeEach(async () => {
      const setup = await createTestWorkspace();
      workspace = setup.workspace;
      context = setup.context;
      testDir = setup.testDir;
    });

    afterEach(async () => {
      await cleanupTestWorkspace(testDir);
    });

    test('full dynamic context lifecycle', async () => {
      // Add new context
      await dynamicContextTool.execute({
        action: 'add',
        name: 'git-status',
        command: 'git status',
        enabled: true
      }, context);

      // List and verify
      let result = await dynamicContextTool.execute({
        action: 'list'
      }, context);
      expect(result.data).toContainEqual({
        name: 'git-status',
        command: 'git status',
        enabled: true
      });

      // Update context
      await dynamicContextTool.execute({
        action: 'update',
        name: 'git-status',
        enabled: false
      }, context);

      // List and verify update
      result = await dynamicContextTool.execute({
        action: 'list'
      }, context);
      expect(result.data).toContainEqual({
        name: 'git-status',
        command: 'git status',
        enabled: false
      });

      // Remove context
      await dynamicContextTool.execute({
        action: 'remove',
        name: 'git-status'
      }, context);

      // List and verify removal
      result = await dynamicContextTool.execute({
        action: 'list'
      }, context);
      expect(result.data).not.toContainEqual({
        name: 'git-status',
        command: 'git status',
        enabled: false
      });
    });

    test('handles non-existent context', async () => {
      await expect(dynamicContextTool.execute({
        action: 'update',
        name: 'non-existent',
        enabled: false
      }, context)).rejects.toThrow();

      await expect(dynamicContextTool.execute({
        action: 'remove',
        name: 'non-existent'
      }, context)).rejects.toThrow();
    });
  });
});