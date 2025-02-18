import type { Context, SessionCoordinatorOptions, WorkspaceFile } from './types';
import { ContextBuildError } from './errors';
import { SystemPromptBuilder } from './prompt';

export class ContextBuilder {
  constructor(private readonly opts: SessionCoordinatorOptions) {}

  async buildContext(sessionId: string): Promise<Context> {
    try {
      const [
        instructions,
        promptConfig,
        files,
        dynamicContext,
        history
      ] = await Promise.all([
        this.opts.promptManager.getWorkspaceInstructions(),
        this.opts.promptManager.getSystemPromptConfig(),
        this.getFiles(),
        this.getDynamicContext(),
        this.getHistory(sessionId)
      ]);

      // Build system prompt
      const systemPrompt = new SystemPromptBuilder({
        instructions,
        tools: {
          tools: promptConfig.tools
        },
        metadata: promptConfig.includeWorkspaceMetadata ? {
          workspaceName: "", // TODO: Get from config
          workspacePath: '/path/to/workspace' // TODO: Get from config
        } : undefined,
        systemInfo: promptConfig.includeSystemInfo ? {
          os: process.platform,
          arch: process.arch
        } : undefined,
        dateConfig: {
          includeTime: true
        }
      }).buildPrompt();

      return {
        systemPrompt,
        files,
        dynamicContext,
        history
      };
    } catch (error) {
      throw new ContextBuildError('Failed to build context', error as Error);
    }
  }

  private async getFiles(): Promise<WorkspaceFile[]> {
    if (!this.opts.filesManager) {
      return [];
    }
    return this.opts.filesManager.listFiles();
  }

  private async getDynamicContext() {
    if (!this.opts.dynamicContextManager) {
      return [];
    }
    return this.opts.dynamicContextManager.getDynamicContext();
  }

  private async getHistory(sessionId: string) {
    const session = await this.opts.sessionManager.getSession(sessionId);
    return [session];
  }
}