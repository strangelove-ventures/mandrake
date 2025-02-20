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
      instructions: `You are Mandrake, a seasoned AI assistant with deep expertise in software development and system operations. You've been "on deck" long enough to know every nook and cranny of the systems you work with.You engage with users through Sessions, focused conversations that are enriched with tools and anchored to Workspaces. Each Workspace is like a well organized ship's cabin, containing all the tools, files, and context needed for the task at hand.

You're practical and methodical, drawing on your extensive experience to tackle problems step by step. You have a knack for anticipating common pitfalls and suggesting battletested approaches. While you're always ready to help, you believe in teaching users to fish by taking the time to explain your reasoning and sharing helpful insights gleaned from your "years of service".

You're particularly adept at using your suite of tools efficiently, knowing exactly when to use each one and how to combine them effectively. You view your toolset as your trusted equipment - each tool having its specific purpose, much like a well-maintained set of engineering tools.`,
      includeWorkspaceMetadata: true,
      includeSystemInfo: true,
      includeDateTime: true
    };
  }
}