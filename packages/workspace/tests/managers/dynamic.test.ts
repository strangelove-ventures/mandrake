import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { DynamicContextManager } from '../../src/managers/dynamic';
import { createTestDirectory, type TestDirectory } from '../utils';
import type { DynamicContextMethodConfig } from '../../src/types/schemas';

describe('DynamicContextManager', () => {
  let testDir: TestDirectory;
  let manager: DynamicContextManager;

  beforeEach(async () => {
    testDir = await createTestDirectory('dynamic-test-');
    manager = new DynamicContextManager(join(testDir.path, 'context.json'));
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Fresh State', () => {
    test('should start with empty context list', async () => {
      const contexts = await manager.list();
      expect(contexts).toEqual([]);
    });
  });

  describe('Context Management', () => {
    const testContext: Omit<DynamicContextMethodConfig, 'id'> = {
      serverId: 'test-server',
      methodName: 'test-method',
      params: { foo: 'bar' },
      refresh: {
        enabled: true,
        interval: '*/5 * * * *'
      }
    };

    test('should create context', async () => {
      const id = await manager.create(testContext);
      expect(id).toBeDefined();
      
      const contexts = await manager.list();
      expect(contexts).toHaveLength(1);
      expect(contexts[0]).toEqual({
        ...testContext,
        id
      });
    });

    test('should get context by id', async () => {
      const id = await manager.create(testContext);
      const context = await manager.get(id);
      expect(context).toEqual({
        ...testContext,
        id
      });
    });

    test('should update context', async () => {
      const id = await manager.create(testContext);
      await manager.update(id, {
        params: { bar: 'baz' }
      });

      const context = await manager.get(id);
      expect(context?.params).toEqual({ bar: 'baz' });
    });

    test('should delete context', async () => {
      const id = await manager.create(testContext);
      await manager.delete(id);

      const contexts = await manager.list();
      expect(contexts).toEqual([]);
    });

    test('should set enabled state', async () => {
      const id = await manager.create(testContext);
      await manager.setEnabled(id, false);

      const context = await manager.get(id);
      expect(context?.refresh.enabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent context', async () => {
      await expect(manager.get('non-existent'))
        .resolves.toBeUndefined();
      
      await expect(manager.update('non-existent', {}))
        .rejects.toThrow();

      await expect(manager.delete('non-existent'))
        .rejects.toThrow();

      await expect(manager.setEnabled('non-existent', false))
        .rejects.toThrow();
    });

    test('should handle corrupted file', async () => {
      const testContext: Omit<DynamicContextMethodConfig, 'id'> = {
        serverId: 'test-server',
        methodName: 'test-method',
        params: {},
        refresh: { enabled: true }
      };
      await manager.create(testContext);

      // Corrupt the file
      await Bun.write(join(testDir.path, 'context.json'), 'invalid json');

      // Should reset to defaults
      const contexts = await manager.list();
      expect(contexts).toEqual([]);
    });
  });
});