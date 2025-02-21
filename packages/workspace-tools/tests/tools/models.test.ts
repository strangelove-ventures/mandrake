import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { modelsManagementTool } from '../../src/tools/models';
import { WorkspaceToolContext } from '../../src/types';
import { createTestWorkspace, cleanupTestWorkspace } from '../utils/test-helpers';

describe('Models Management Tool', () => {
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

  test('full model configuration lifecycle', async () => {
    // Add new model configuration
    const provider = 'anthropic';
    const model = 'claude-3-opus';
    const apiKey = 'test-key';
    const config = { maxTokens: 4096 };

    await modelsManagementTool.execute({
      action: 'add',
      provider,
      model,
      apiKey,
      config
    }, context);

    // List and verify
    let result = await modelsManagementTool.execute({
      action: 'list'
    }, context);

    const addedConfig = result.data.find(
      (m: any) => m.provider === provider && m.model === model
    );
    expect(addedConfig).toBeDefined();
    expect(addedConfig.config).toEqual({
      ...config,
      apiKey
    });

    // Enable model
    await modelsManagementTool.execute({
      action: 'enable',
      provider,
      model
    }, context);

    // Verify it's enabled
    result = await modelsManagementTool.execute({
      action: 'list'
    }, context);
    expect(result.data.find(
      (m: any) => m.provider === provider && m.model === model && m.enabled
    )).toBeDefined();

    // Disable model
    await modelsManagementTool.execute({
      action: 'disable'
    }, context);

    // Verify it's disabled
    result = await modelsManagementTool.execute({
      action: 'list'
    }, context);
    expect(result.data.find(
      (m: any) => m.provider === provider && m.model === model && m.enabled
    )).toBeUndefined();

    // Remove model configuration
    await modelsManagementTool.execute({
      action: 'remove',
      provider,
      model
    }, context);

    // Verify removal
    result = await modelsManagementTool.execute({
      action: 'list'
    }, context);
    expect(result.data.find(
      (m: any) => m.provider === provider && m.model === model
    )).toBeUndefined();
  });

  test('handles invalid model configurations', async () => {
    // Missing provider
    await expect(modelsManagementTool.execute({
      action: 'add',
      model: 'claude-3-opus'
    }, context)).rejects.toThrow();

    // Missing model
    await expect(modelsManagementTool.execute({
      action: 'add',
      provider: 'anthropic'
    }, context)).rejects.toThrow();

    // Non-existent model for enable
    await expect(modelsManagementTool.execute({
      action: 'enable',
      provider: 'nonexistent',
      model: 'invalid'
    }, context)).rejects.toThrow();
  });

  test('safely handles API keys', async () => {
    const provider = 'anthropic';
    const model = 'claude-3-opus';
    const apiKey = 'test-key';

    // Add configuration with API key
    await modelsManagementTool.execute({
      action: 'add',
      provider,
      model,
      apiKey
    }, context);

    // Verify API key is stored
    const result = await modelsManagementTool.execute({
      action: 'list'
    }, context);

    const config = result.data.find(
      (m: any) => m.provider === provider && m.model === model
    );
    expect(config.config.apiKey).toBe(apiKey);
  });
});