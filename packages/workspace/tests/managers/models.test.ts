import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ModelsManager } from '../../src/managers/models';
import type { ProviderConfig, ModelConfig } from '@mandrake/utils';

describe('ModelsManager', () => {
  let tmpDir: string;
  let configPath: string;
  let manager: ModelsManager;

  const testProvider: ProviderConfig = {
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
  };

  const testModel: ModelConfig = {
    enabled: true,
    providerId: 'ollama',
    modelId: 'llama2',
    config: {
      temperature: 0.7,
      maxTokens: 4096,
    },
  };

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'models-test-'));
    configPath = join(tmpDir, 'models.json');
    manager = new ModelsManager(configPath);
    await manager.init();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('provider operations', () => {
    test('adds and gets provider', async () => {
      await manager.addProvider('ollama', testProvider);
      const provider = await manager.getProvider('ollama');
      expect(provider).toEqual(testProvider);
    });

    test('lists providers', async () => {
      await manager.addProvider('ollama', testProvider);
      const providers = await manager.listProviders();
      expect(providers).toHaveProperty('anthropic'); // default provider
      expect(providers).toHaveProperty('ollama', testProvider);
    });

    test('updates provider', async () => {
      await manager.addProvider('ollama', testProvider);
      await manager.updateProvider('ollama', { baseUrl: 'http://localhost:8000' });
      const provider = await manager.getProvider('ollama');
      expect(provider.baseUrl).toBe('http://localhost:8000');
    });

    test('removes provider', async () => {
      await manager.addProvider('ollama', testProvider);
      await manager.removeProvider('ollama');
      const providers = await manager.listProviders();
      expect(providers).not.toHaveProperty('ollama');
    });

    test('removes models when provider is removed', async () => {
      await manager.addProvider('ollama', testProvider);
      await manager.addModel('llama2', testModel);
      await manager.setActive('llama2');
      
      await manager.removeProvider('ollama');
      
      const models = await manager.listModels();
      expect(models).not.toHaveProperty('llama2');
      const active = await manager.getActive();
      expect(active).toBe('');
    });

    test('throws on duplicate provider', async () => {
      await manager.addProvider('ollama', testProvider);
      await expect(manager.addProvider('ollama', testProvider))
        .rejects.toThrow('Provider ollama already exists');
    });
  });

  describe('model operations', () => {
    beforeEach(async () => {
      await manager.addProvider('ollama', testProvider);
    });

    test('adds and gets model', async () => {
      await manager.addModel('llama2', testModel);
      const model = await manager.getModel('llama2');
      expect(model).toEqual(testModel);
    });

    test('lists models', async () => {
      await manager.addModel('llama2', testModel);
      const models = await manager.listModels();
      expect(models).toHaveProperty('llama2', testModel);
    });

    test('updates model', async () => {
      await manager.addModel('llama2', testModel);
      await manager.updateModel('llama2', { 
        config: { ...testModel.config, temperature: 0.9 } 
      });
      const model = await manager.getModel('llama2');
      expect(model.config.temperature).toBe(0.9);
    });

    test('removes model', async () => {
      await manager.addModel('llama2', testModel);
      await manager.setActive('llama2');
      
      await manager.removeModel('llama2');
      
      const models = await manager.listModels();
      expect(models).not.toHaveProperty('llama2');
      const active = await manager.getActive();
      expect(active).toBe('');
    });

    test('throws when provider not found', async () => {
      await expect(manager.addModel('llama2', { ...testModel, providerId: 'missing' }))
        .rejects.toThrow('Provider missing not found');
    });

    test('throws on duplicate model', async () => {
      await manager.addModel('llama2', testModel);
      await expect(manager.addModel('llama2', testModel))
        .rejects.toThrow('Model llama2 already exists');
    });
  });

  describe('active model operations', () => {
    beforeEach(async () => {
      await manager.addProvider('ollama', testProvider);
      await manager.addModel('llama2', testModel);
    });

    test('sets and gets active model', async () => {
      await manager.setActive('llama2');
      const active = await manager.getActive();
      expect(active).toBe('llama2');
    });

    test('throws when setting non-existent model as active', async () => {
      await expect(manager.setActive('missing'))
        .rejects.toThrow('Model missing not found');
    });

    test('allows clearing active model', async () => {
      await manager.setActive('llama2');
      await manager.setActive('');
      const active = await manager.getActive();
      expect(active).toBe('');
    });
  });
});