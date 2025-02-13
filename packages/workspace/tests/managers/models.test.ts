import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { ModelsManager } from '../../src/managers/models';
import { createTestDirectory, type TestDirectory } from '../utils/utils';
import type { ModelsConfig } from '../../src/types/workspace';

describe('ModelsManager', () => {
  let testDir: TestDirectory;
  let manager: ModelsManager;

  beforeEach(async () => {
    testDir = await createTestDirectory('models-test-');
    manager = new ModelsManager(join(testDir.path, 'models.json'));
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Fresh State', () => {
    test('should start with default config', async () => {
      const config = await manager.get();
      expect(config).toEqual({
        provider: '',
        maxTokens: 16000,
        temperature: 0.7
      });
    });
  });

  describe('Config Management', () => {
    test('should update config', async () => {
      const updates: Partial<ModelsConfig> = {
        provider: 'openai',
        maxTokens: 8000,
        temperature: 0.5
      };

      await manager.update(updates);
      const config = await manager.get();
      expect(config).toEqual({
        ...manager.getDefaults(),
        ...updates
      });
    });

    test('should validate temperature range', async () => {
      await expect(manager.update({ temperature: 1.5 }))
        .rejects.toThrow();
    });

    test('should persist config across instances', async () => {
      const updates = {
        provider: 'openai',
        temperature: 0.5
      };

      await manager.update(updates);

      // Create new instance pointing to same file
      const newManager = new ModelsManager(join(testDir.path, 'models.json'));
      const config = await newManager.get();
      expect(config).toEqual({
        ...manager.getDefaults(),
        ...updates
      });
    });
  });

  describe('File Handling', () => {
    test('should handle corrupted file', async () => {
      await manager.update({ provider: 'test' });

      // Corrupt the file
      await Bun.write(join(testDir.path, 'models.json'), 'invalid json');

      // Should reset to defaults
      const config = await manager.get();
      expect(config).toEqual(manager.getDefaults());
    });
  });
});