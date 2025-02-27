import { BaseConfigManager } from './base';
import { 
  type DynamicContextMethodConfig, 
  contextConfigSchema 
} from '../types';

export class DynamicContextManager extends BaseConfigManager<DynamicContextMethodConfig[]> {
  constructor(path: string) {
    super(path, contextConfigSchema, { type: 'dynamic-context' });
  }

  async list(): Promise<DynamicContextMethodConfig[]> {
    return this.read();
  }

  async get(id: string): Promise<DynamicContextMethodConfig | undefined> {
    const contexts = await this.read();
    return contexts.find(c => c.id === id);
  }

  async create(config: Omit<DynamicContextMethodConfig, 'id'>): Promise<string> {
    const contexts = await this.read();
    const id = crypto.randomUUID();
    const newContext = { ...config, id };
    
    contexts.push(newContext);
    await this.write(contexts);
    
    return id;
  }

  async update(id: string, updates: Partial<DynamicContextMethodConfig>): Promise<void> {
    const contexts = await this.read();
    const index = contexts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Context ${id} not found`);
    }
    contexts[index] = { ...contexts[index], ...updates };
    await this.write(contexts);
  }

  async delete(id: string): Promise<void> {
    const contexts = await this.read();
    const filtered = contexts.filter(c => c.id !== id);
    if (filtered.length === contexts.length) {
      throw new Error(`Context ${id} not found`);
    }
    await this.write(filtered);
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const contexts = await this.read();
    const context = contexts.find(c => c.id === id);
    if (!context) {
      throw new Error(`Context ${id} not found`);
    }
    
    context.refresh.enabled = enabled;
    await this.write(contexts);
  }

  protected getDefaults(): DynamicContextMethodConfig[] {
    // TODO: lets add some default contexts here
    return [];
  }
}