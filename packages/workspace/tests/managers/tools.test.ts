import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { ToolsManager } from '../../src/managers/tools';
import { createTestDirectory, type TestDirectory } from '../utils/utils';
import type { ServerConfig } from '../../src/types/workspace';

describe('ToolsManager', () => {
  let testDir: TestDirectory;
  let manager: ToolsManager;

  beforeEach(async () => {
    testDir = await createTestDirectory('tools-test-');
    manager = new ToolsManager(join(testDir.path, 'tools.json'));
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Fresh State', () => {
    test('should start with empty tool list', async () => {
      const tools = await manager.list();
      expect(tools).toEqual([]);
    });
  });

  describe('Tool Management', () => {
    const testTool: ServerConfig = {
      id: 'test-tool',
      name: 'Test Tool',
      image: 'test-image:latest'
    };

    test('should add tool', async () => {
      await manager.add(testTool);
      const tools = await manager.list();
      expect(tools).toEqual([testTool]);
    });

    test('should prevent duplicate tool ids', async () => {
      await manager.add(testTool);
      await expect(manager.add(testTool)).rejects.toThrow();
    });

    test('should get tool by id', async () => {
      await manager.add(testTool);
      const tool = await manager.get(testTool.id);
      expect(tool).toEqual(testTool);
    });

    test('should return undefined for non-existent tool', async () => {
      const tool = await manager.get('non-existent');
      expect(tool).toBeUndefined();
    });

    test('should update tool', async () => {
      await manager.add(testTool);
      await manager.update(testTool.id, { name: 'Updated Name' });
      const tool = await manager.get(testTool.id);
      expect(tool).toEqual({ ...testTool, name: 'Updated Name' });
    });

    test('should fail to update non-existent tool', async () => {
      await expect(manager.update('non-existent', { name: 'New Name' }))
        .rejects.toThrow();
    });

    test('should remove tool', async () => {
      await manager.add(testTool);
      await manager.remove(testTool.id);
      const tools = await manager.list();
      expect(tools).toEqual([]);
    });

    test('should fail to remove non-existent tool', async () => {
      await expect(manager.remove('non-existent')).rejects.toThrow();
    });
  });

  describe('File Handling', () => {
    test('should persist tools across instances', async () => {
      const testTool: ServerConfig = {
        id: 'test-tool',
        name: 'Test Tool',
        image: 'test-image:latest'
      };

      await manager.add(testTool);

      // Create new instance pointing to same file
      const newManager = new ToolsManager(join(testDir.path, 'tools.json'));
      const tools = await newManager.list();
      expect(tools).toEqual([testTool]);
    });

    test('should handle corrupted file', async () => {
      const testTool: ServerConfig = {
        id: 'test-tool',
        name: 'Test Tool',
        image: 'test-image:latest'
      };

      await manager.add(testTool);

      // Corrupt the file
      await Bun.write(join(testDir.path, 'tools.json'), 'invalid json');

      // Should reset to defaults
      const tools = await manager.list();
      expect(tools).toEqual([]);
    });
  });
});