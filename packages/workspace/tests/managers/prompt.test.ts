import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { PromptManager } from '../../src/managers/prompt';
import { createTestDirectory, type TestDirectory } from '../utils/utils';

describe('PromptManager', () => {
  let testDir: TestDirectory;
  let manager: PromptManager;

  beforeEach(async () => {
    testDir = await createTestDirectory('prompt-test-');
    manager = new PromptManager(join(testDir.path, 'prompt.md'));
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe('Fresh State', () => {
    test('should start with default prompt', async () => {
      const prompt = await manager.get();
      expect(prompt).toBe('You are a helpful AI assistant.');
    });
  });

  describe('Prompt Management', () => {
    test('should update prompt', async () => {
      const newPrompt = 'You are a specialized coding assistant.';
      await manager.update(newPrompt);
      const prompt = await manager.get();
      expect(prompt).toBe(newPrompt);
    });

    test('should persist prompt across instances', async () => {
      const newPrompt = 'You are a specialized coding assistant.';
      await manager.update(newPrompt);

      // Create new instance pointing to same file
      const newManager = new PromptManager(join(testDir.path, 'prompt.md'));
      const prompt = await newManager.get();
      expect(prompt).toBe(newPrompt);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing file', async () => {
      const nonExistentManager = new PromptManager(join(testDir.path, 'nonexistent.md'));
      const prompt = await nonExistentManager.get();
      expect(prompt).toBe('You are a helpful AI assistant.');
    });
  });
});