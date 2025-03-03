import { BaseConfigManager } from './base';
import { 
  type ModelConfig,
  type ProviderConfig,
  type ModelsConfig,
  modelsConfigSchema,
  getDefaultModel,
} from '@mandrake/utils';

export class ModelsManager extends BaseConfigManager<ModelsConfig> {
  constructor(path: string) {
    super(path, modelsConfigSchema, { type: 'models' });
  }

  async listProviders(): Promise<Record<string, ProviderConfig>> {
    const config = await this.read();
    return config.providers;
  }

  async getProvider(id: string): Promise<ProviderConfig> {
    const config = await this.read();
    const provider = config.providers[id];
    if (!provider) {
      throw new Error(`Provider ${id} not found`);
    }
    return provider;
  }

  async addProvider(id: string, config: ProviderConfig): Promise<void> {
    const current = await this.read();
    if (current.providers[id]) {
      throw new Error(`Provider ${id} already exists`);
    }
    await this.write({
      ...current,
      providers: {
        ...current.providers,
        [id]: config,
      },
    });
  }

  async updateProvider(id: string, updates: Partial<ProviderConfig>): Promise<void> {
    const current = await this.read();
    const provider = current.providers[id];
    if (!provider) {
      throw new Error(`Provider ${id} not found`);
    }
    await this.write({
      ...current,
      providers: {
        ...current.providers,
        [id]: { ...provider, ...updates },
      },
    });
  }

  async removeProvider(id: string): Promise<void> {
    const current = await this.read();
    if (!current.providers[id]) {
      throw new Error(`Provider ${id} not found`);
    }
    const { [id]: _, ...remainingProviders } = current.providers;

    // Remove any models using this provider
    const updatedModels = Object.entries(current.models).reduce((acc, [modelId, model]) => {
      if ((model as any).providerId !== id) {
        acc[modelId] = model;
      }
      return acc;
    }, {} as Record<string, ModelConfig>);

    await this.write({
      ...current,
      providers: remainingProviders,
      models: updatedModels,
      // Reset active model if it was using this provider
      active: current.active && current.models[current.active]?.providerId === id ? '' : current.active,
    });
  }

  // Model operations
  async listModels(): Promise<Record<string, ModelConfig>> {
    const config = await this.read();
    return config.models;
  }

  async getModel(id: string): Promise<ModelConfig> {
    const config = await this.read();
    const model = config.models[id];
    if (!model) {
      throw new Error(`Model ${id} not found`);
    }
    return model;
  }

  async addModel(id: string, config: ModelConfig): Promise<void> {
    const current = await this.read();
    if (current.models[id]) {
      throw new Error(`Model ${id} already exists`);
    }
    if (!current.providers[config.providerId]) {
      throw new Error(`Provider ${config.providerId} not found`);
    }
    await this.write({
      ...current,
      models: {
        ...current.models,
        [id]: config,
      },
    });
  }

  async updateModel(id: string, updates: Partial<ModelConfig>): Promise<void> {
    const current = await this.read();
    const model = current.models[id];
    if (!model) {
      throw new Error(`Model ${id} not found`);
    }
    if (updates.providerId && !current.providers[updates.providerId]) {
      throw new Error(`Provider ${updates.providerId} not found`);
    }
    await this.write({
      ...current,
      models: {
        ...current.models,
        [id]: { ...model, ...updates },
      },
    });
  }

  async removeModel(id: string): Promise<void> {
    const current = await this.read();
    if (!current.models[id]) {
      throw new Error(`Model ${id} not found`);
    }
    const { [id]: _, ...remainingModels } = current.models;
    await this.write({
      ...current,
      models: remainingModels,
      active: current.active === id ? '' : current.active,
    });
  }

  // Active model operations
  async getActive(): Promise<string> {
    const config = await this.read();
    return config.active;
  }

  async setActive(id: string): Promise<void> {
    const current = await this.read();
    if (id && !current.models[id]) {
      throw new Error(`Model ${id} not found`);
    }
    await this.write({
      ...current,
      active: id,
    });
  }
  protected getDefaults(): ModelsConfig {
    const anthropic = 'anthropic';
    const ollama = 'ollama';
    const xai = 'xai';
    const anthropicModel = getDefaultModel(anthropic);
    const ollamaModel = getDefaultModel(ollama);
    const xaiModel = getDefaultModel(xai);
    return {
      active: anthropicModel,
      providers: {
        anthropic: {
          type: anthropic,
          apiKey: "your-api-key-here",
        },
        ollama: {
          type: ollama
        },
        xai: {
          type: xai,
          apiKey: "your-api-key-here",
        }
      },
      models: {
        [`${anthropicModel}`]: {
          enabled: true,
          providerId: anthropic,
          modelId: anthropicModel,
          config: {
            temperature: 0.7,
            maxTokens: 8400,
          }
        },
        [`${ollamaModel}`]: {
          enabled: true,
          providerId: ollama,
          modelId: ollamaModel,
          config: {
            temperature: 0.7,
            maxTokens: 2048,
          }
        },
        [`${xaiModel}`]: {
          enabled: true,
          providerId: xai,
          modelId: xaiModel,
          config: {
            temperature: 0.7,
            maxTokens: 4096,
          }
        }
      }
    };
  }
}
