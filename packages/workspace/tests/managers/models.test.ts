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
      await manager.addProvider('ollama-custom', testProvider);
      const provider = await manager.getProvider('ollama-custom');
      expect(provider).toEqual(testProvider);
    });

    test('lists providers', async () => {
      await manager.addProvider('ollama-custom', testProvider);
      const providers = await manager.listProviders();
      
      // Check default providers
      expect(providers).toHaveProperty('anthropic');
      expect(providers).toHaveProperty('ollama');
      expect(providers).toHaveProperty('xai');
      
      // Check added provider
      expect(providers).toHaveProperty('ollama-custom', testProvider);
    });

    test('updates provider', async () => {
      await manager.addProvider('ollama-custom', testProvider);
      await manager.updateProvider('ollama-custom', { baseUrl: 'http://localhost:8000' });
      const provider = await manager.getProvider('ollama-custom');
      expect(provider.baseUrl).toBe('http://localhost:8000');
    });

    test('removes provider', async () => {
      await manager.addProvider('ollama-custom', testProvider);
      await manager.removeProvider('ollama-custom');
      const providers = await manager.listProviders();
      expect(providers).not.toHaveProperty('ollama-custom');
    });

    test('removes models when provider is removed', async () => {
      await manager.addProvider('ollama-custom', testProvider);
      await manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'});
      await manager.setActive('llama2');
      
      await manager.removeProvider('ollama-custom');
      
      const models = await manager.listModels();
      expect(models).not.toHaveProperty('llama2');
      
      // Should reset active to empty if the active model was from the removed provider
      const active = await manager.getActive();
      expect(active).toBe('');
    });

    test('throws on duplicate provider', async () => {
      await manager.addProvider('ollama-custom', testProvider);
      await expect(manager.addProvider('ollama-custom', testProvider))
        .rejects.toThrow('Provider ollama-custom already exists');
    });
  });

  describe('model operations', () => {
    beforeEach(async () => {
      await manager.addProvider('ollama-custom', testProvider);
    });

    test('adds and gets model', async () => {
      await manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'});
      const model = await manager.getModel('llama2');
      expect(model).toEqual({...testModel, providerId: 'ollama-custom'});
    });

    test('lists models', async () => {
      await manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'});
      const models = await manager.listModels();
      
      // Default models should exist
      expect(models).toHaveProperty('anthropicModel');
      expect(models).toHaveProperty('ollamaModel');
      expect(models).toHaveProperty('xaiModel');
      
      // Our test model should exist
      expect(models).toHaveProperty('llama2', {...testModel, providerId: 'ollama-custom'});
    });

    test('updates model', async () => {
      await manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'});
      await manager.updateModel('llama2', { 
        config: { ...testModel.config, temperature: 0.9 } 
      });
      const model = await manager.getModel('llama2');
      expect(model.config.temperature).toBe(0.9);
    });

    test('removes model', async () => {
      await manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'});
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
      await manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'});
      await expect(manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'}))
        .rejects.toThrow('Model llama2 already exists');
    });
  });

  describe('active model operations', () => {
    beforeEach(async () => {
      await manager.addProvider('ollama-custom', testProvider);
      await manager.addModel('llama2', {...testModel, providerId: 'ollama-custom'});
    });

    test('gets default active model', async () => {
      const active = await manager.getActive();
      expect(active).toBe('grok-beta');
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