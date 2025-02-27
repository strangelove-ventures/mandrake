import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { PromptManager } from '../../src/managers/prompt';
import type { PromptConfig } from '../../src/types/workspace/prompt';
import { createTestDirectory, type TestDirectory } from '../utils/utils';

describe('PromptManager', () => {
  let testDir: TestDirectory;
  let manager: PromptManager;

  beforeEach(async () => {
    testDir = await createTestDirectory('prompt-test-');
    manager = new PromptManager(join(testDir.path, 'prompt.json'));
    await manager.init();
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Initialization', () => {
    test('should create config file on init', async () => {
      await manager.init();
      const config = await manager.getConfig();
      expect(config.instructions).toInclude("Mandrake");
      expect(config.includeDateTime).toBeTrue();
      expect(config.includeSystemInfo).toBeTrue();
      expect(config.includeWorkspaceMetadata).toBeTrue();
    });

    test('should preserve existing config on init', async () => {
      const customConfig: PromptConfig = {
        instructions: 'Custom instructions',
        includeWorkspaceMetadata: false,
        includeSystemInfo: false,
        includeDateTime: false
      };
      await manager.updateConfig(customConfig);
      await manager.init();
      const config = await manager.getConfig();
      expect(config).toEqual(customConfig);
    });
  });

  describe('Fresh State', () => {
    test('should start with default config', async () => {
      const config = await manager.getConfig();
      expect(config.instructions).toInclude("Mandrake");
      expect(config.includeDateTime).toBeTrue();
      expect(config.includeSystemInfo).toBeTrue();
      expect(config.includeWorkspaceMetadata).toBeTrue();
    });
  });

  describe('Config Management', () => {
    test('should update config', async () => {
      const newConfig: PromptConfig = {
        instructions: 'You are a specialized coding assistant.',
        includeWorkspaceMetadata: false,
        includeSystemInfo: true,
        includeDateTime: false
      };
      await manager.updateConfig(newConfig);
      const config = await manager.getConfig();
      expect(config).toEqual(newConfig);
    });

    test('should persist config across instances', async () => {
      const newConfig: PromptConfig = {
        instructions: 'You are a specialized coding assistant.',
        includeWorkspaceMetadata: true,
        includeSystemInfo: false,
        includeDateTime: true
      };
      await manager.updateConfig(newConfig);

      // Create new instance pointing to same file
      const newManager = new PromptManager(join(testDir.path, 'prompt.json'));
      const config = await newManager.getConfig();
      expect(config).toEqual(newConfig);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing file', async () => {
      const nonExistentManager = new PromptManager(join(testDir.path, 'nonexistent.json'));

      // First call should throw because file doesn't exist
      await expect(nonExistentManager.getConfig()).rejects.toThrow();

      // Init should create the file with defaults
      await nonExistentManager.init();

      // Now we can read the config
      const config = await nonExistentManager.getConfig();
      expect(config.instructions).toInclude("Mandrake");
      expect(config.includeDateTime).toBeTrue();
      expect(config.includeSystemInfo).toBeTrue();
      expect(config.includeWorkspaceMetadata).toBeTrue();
    });

    test('should handle invalid JSON', async () => {
      await Bun.write(join(testDir.path, 'invalid.json'), 'not json');
      const invalidManager = new PromptManager(join(testDir.path, 'invalid.json'));
      await expect(invalidManager.getConfig()).rejects.toThrow();
    });
  });
});