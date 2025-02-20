import { readFile, writeFile } from 'fs/promises';
import { createLogger } from '@mandrake/utils';
import type { PromptConfig } from '../types/workspace/prompt';

export class PromptManager {
  private logger;

  constructor(private path: string) {
    this.logger = createLogger('workspace').child({ 
      meta: {
        component: 'prompt-manager',
        type: 'prompt'
      }
    });
  }

  async init(): Promise<void> {
    try {
      await this.getConfig();
    } catch (error) {
      this.logger.info('Initializing prompt config with defaults', { path: this.path });
      await this.updateConfig(this.getDefaults());
    }
  }

  async getConfig(): Promise<PromptConfig> {
    try {
      const content = await readFile(this.path, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        this.logger.info('Prompt config not found, will create with defaults', { path: this.path });
        return this.getDefaults();
      }
      throw error;
    }
  }

  async updateConfig(config: PromptConfig): Promise<void> {
    await writeFile(this.path, JSON.stringify(config, null, 2));
  }

  private getDefaults(): PromptConfig {
    return {
      instructions: 'You are Mandrake a helpful AI assistant.',
      includeWorkspaceMetadata: true,
      includeSystemInfo: true,
      includeDateTime: true
    };
  }
}