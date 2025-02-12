import { readFile, writeFile } from 'fs/promises';
import { createLogger } from '@mandrake/utils';

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

  async get(): Promise<string> {
    try {
      return await readFile(this.path, 'utf-8');
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        this.logger.info('Prompt file not found, will be created on first write', { path: this.path });
        return this.getDefaults();
      }
      throw error;
    }
  }

  async update(content: string): Promise<void> {
    await writeFile(this.path, content);
  }

  private getDefaults(): string {
    return 'You are a helpful AI assistant.';
  }
}