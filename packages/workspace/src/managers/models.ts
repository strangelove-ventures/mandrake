import { BaseConfigManager } from './base';
import { type ModelsConfig, modelsConfigSchema } from '../types/schemas/models';

export class ModelsManager extends BaseConfigManager<ModelsConfig> {
  constructor(path: string) {
    super(path, modelsConfigSchema, { 
      type: 'models'
    });
  }

  async get(): Promise<ModelsConfig> {
    return this.read();
  }

  async update(config: Partial<ModelsConfig>): Promise<void> {
    const current = await this.read();
    await this.write({ ...current, ...config });
  }

  protected getDefaults(): ModelsConfig {
    return {
      provider: '',
      maxTokens: 16000,
      temperature: 0.7
    };
  }
}