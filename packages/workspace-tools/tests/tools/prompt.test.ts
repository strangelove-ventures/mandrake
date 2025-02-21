import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { promptManagementTool } from '../../src/tools/prompt';
import { WorkspaceToolContext } from '../../src/types';
import { createTestWorkspace, cleanupTestWorkspace } from '../utils/test-helpers';

describe('Prompt Management Tool', () => {
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

  test('manages system prompt', async () => {
    // Get initial prompt (should be empty or default)
    let result = await promptManagementTool.execute({
      action: 'get'
    }, context);
    const initialPrompt = result.data.prompt;

    // Update prompt
    const newPrompt = 'You are a helpful assistant working on the project in {workspace}';
    await promptManagementTool.execute({
      action: 'update',
      prompt: newPrompt
    }, context);

    // Verify update
    result = await promptManagementTool.execute({
      action: 'get'
    }, context);
    expect(result.data.prompt).toBe(newPrompt);
    expect(result.data.prompt).not.toBe(initialPrompt);
  });

  test('validates update parameters', async () => {
    // Missing prompt
    await expect(promptManagementTool.execute({
      action: 'update'
    }, context)).rejects.toThrow();

    // Empty prompt
    await expect(promptManagementTool.execute({
      action: 'update',
      prompt: ''
    }, context)).rejects.toThrow();
  });

  test('preserves prompt across updates', async () => {
    const prompt1 = 'First prompt version';
    const prompt2 = 'Second prompt version';

    // Set first prompt
    await promptManagementTool.execute({
      action: 'update',
      prompt: prompt1
    }, context);

    // Verify first prompt
    let result = await promptManagementTool.execute({
      action: 'get'
    }, context);
    expect(result.data.prompt).toBe(prompt1);

    // Update to second prompt
    await promptManagementTool.execute({
      action: 'update',
      prompt: prompt2
    }, context);

    // Verify second prompt
    result = await promptManagementTool.execute({
      action: 'get'
    }, context);
    expect(result.data.prompt).toBe(prompt2);
  });

  test('handles very long prompts', async () => {
    // Create a long prompt (10KB)
    const longPrompt = 'A'.repeat(10 * 1024);

    // Should handle long prompt without issue
    await promptManagementTool.execute({
      action: 'update',
      prompt: longPrompt
    }, context);

    const result = await promptManagementTool.execute({
      action: 'get'
    }, context);
    expect(result.data.prompt).toBe(longPrompt);
  });
});