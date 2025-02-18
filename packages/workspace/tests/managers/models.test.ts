import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ModelsManager } from '../../src/managers/models';
import type { ProviderConfig, ModelConfig } from '../../src/types/workspace/models';

describe('ModelsManager', () => {
  let tmpDir: string;
  let configPath: string;
  let manager: ModelsManager;

  const testProvider: ProviderConfig = {
    type: 'anthropic',
    apiKey: 'test-key',
    baseUrl: 'https://api.anthropic.com',
  };

  const testModel: ModelConfig = {
    enabled: true,
    providerId: 'anthropic',
    modelId: 'claude-3',
    config: {
      temperature: 0.7,
      maxTokens: 4096,
    },
  };

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'models-test-'));
    configPath = join(tmpDir, 'models.json');
    manager = new ModelsManager(configPath);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('provider operations', () => {
    test('adds and gets provider', async () => {
      await manager.addProvider('anthropic', testProvider);
      const provider = await manager.getProvider('anthropic');
      expect(provider).toEqual(testProvider);
    });

    test('lists providers', async () => {
      await manager.addProvider('anthropic', testProvider);
      const providers = await manager.listProviders();
      expect(providers).toEqual({ anthropic: testProvider });
    });

    test('updates provider', async () => {
      await manager.addProvider('anthropic', testProvider);
      await manager.updateProvider('anthropic', { apiKey: 'new-key' });
      const provider = await manager.getProvider('anthropic');
      expect(provider.apiKey).toBe('new-key');
    });

    test('removes provider', async () => {
      await manager.addProvider('anthropic', testProvider);
      await manager.removeProvider('anthropic');
      const providers = await manager.listProviders();
      expect(providers).toEqual({});
    });

    test('removes models when provider is removed', async () => {
      await manager.addProvider('anthropic', testProvider);
      await manager.addModel('claude', testModel);
      await manager.setActive('claude');
      
      await manager.removeProvider('anthropic');
      
      const models = await manager.listModels();
      expect(models).toEqual({});
      const active = await manager.getActive();
      expect(active).toBe('');
    });

    test('throws on duplicate provider', async () => {
      await manager.addProvider('anthropic', testProvider);
      await expect(manager.addProvider('anthropic', testProvider))
        .rejects.toThrow('Provider anthropic already exists');
    });
  });

  describe('model operations', () => {
    beforeEach(async () => {
      await manager.addProvider('anthropic', testProvider);
    });

    test('adds and gets model', async () => {
      await manager.addModel('claude', testModel);
      const model = await manager.getModel('claude');
      expect(model).toEqual(testModel);
    });

    test('lists models', async () => {
      await manager.addModel('claude', testModel);
      const models = await manager.listModels();
      expect(models).toEqual({ claude: testModel });
    });

    test('updates model', async () => {
      await manager.addModel('claude', testModel);
      await manager.updateModel('claude', { 
        config: { ...testModel.config, temperature: 0.9 } 
      });
      const model = await manager.getModel('claude');
      expect(model.config.temperature).toBe(0.9);
    });

    test('removes model', async () => {
      await manager.addModel('claude', testModel);
      await manager.setActive('claude');
      
      await manager.removeModel('claude');
      
      const models = await manager.listModels();
      expect(models).toEqual({});
      const active = await manager.getActive();
      expect(active).toBe('');
    });

    test('throws when provider not found', async () => {
      await expect(manager.addModel('claude', { ...testModel, providerId: 'missing' }))
        .rejects.toThrow('Provider missing not found');
    });

    test('throws on duplicate model', async () => {
      await manager.addModel('claude', testModel);
      await expect(manager.addModel('claude', testModel))
        .rejects.toThrow('Model claude already exists');
    });
  });

  describe('active model operations', () => {
    beforeEach(async () => {
      await manager.addProvider('anthropic', testProvider);
      await manager.addModel('claude', testModel);
    });

    test('sets and gets active model', async () => {
      await manager.setActive('claude');
      const active = await manager.getActive();
      expect(active).toBe('claude');
    });

    test('throws when setting non-existent model as active', async () => {
      await expect(manager.setActive('missing'))
        .rejects.toThrow('Model missing not found');
    });

    test('allows clearing active model', async () => {
      await manager.setActive('claude');
      await manager.setActive('');
      const active = await manager.getActive();
      expect(active).toBe('');
    });
  });
});
