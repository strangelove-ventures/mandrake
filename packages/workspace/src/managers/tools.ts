import { BaseConfigManager } from './base';
import { type ServerConfig, toolsConfigSchema } from '../types/schemas/tools';

export class ToolsManager extends BaseConfigManager<ServerConfig[]> {
  constructor(path: string) {
    super(path, toolsConfigSchema, { 
      type: 'tools'
    });
  }

  async list(): Promise<ServerConfig[]> {
    return this.read();
  }

  async get(id: string): Promise<ServerConfig | undefined> {
    const tools = await this.read();
    return tools.find(tool => tool.id === id);
  }

  async add(config: ServerConfig): Promise<void> {
    const tools = await this.read();
    if (tools.some(t => t.id === config.id)) {
      throw new Error(`Tool with ID ${config.id} already exists`);
    }
    tools.push(config);
    await this.write(tools);
  }

  async update(id: string, updates: Partial<ServerConfig>): Promise<void> {
    const tools = await this.read();
    const index = tools.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Tool ${id} not found`);
    }
    tools[index] = { ...tools[index], ...updates };
    await this.write(tools);
  }

  async remove(id: string): Promise<void> {
    const tools = await this.read();
    const filtered = tools.filter(t => t.id !== id);
    if (filtered.length === tools.length) {
      throw new Error(`Tool ${id} not found`);
    }
    await this.write(filtered);
  }

  protected getDefaults(): ServerConfig[] {
    return [];
  }
}