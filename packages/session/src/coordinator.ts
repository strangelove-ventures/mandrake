import type { Logger } from '@mandrake/utils';
import { createLogger } from '@mandrake/utils';
import type { SessionCoordinatorOptions, Context } from './types';
import { ContextBuildError, MessageProcessError, ToolCallError } from './errors';
// import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { setupProviderFromManager } from './utils/provider';
import { convertSessionToMessages } from './utils/messages';
import { type SystemPromptBuilderConfig, SystemPromptBuilder } from './prompt/builder';

export class SessionCoordinator {
  private logger: Logger;

  constructor(private readonly opts: SessionCoordinatorOptions) {
    this.logger = opts.logger || createLogger('SessionCoordinator');
  }
  async handleMessage(sessionId: string, request: string): Promise<void> {
    try {
      // Setup provider using our new util
      const provider = await setupProviderFromManager(this.opts.modelsManager);
      this.logger.debug('Created provider for request', { sessionId });

      // Build context for request
      const context = await this.buildContext(sessionId);
      this.logger.debug('Built context for request', { sessionId });

      // Create provider message stream
      const messageStream = provider.createMessage(
        context.systemPrompt,
        [...context.history, { role: 'user', content: request }]
      );

      // Process message stream
      let content: string[] = [];
      let toolCalls: any[] = [];

      for await (const chunk of messageStream) {
        switch (chunk.type) {
          case 'text':
            content.push(chunk.text);
            break;
          case 'tool_call':
            toolCalls.push(chunk.toolCall);
            // Handle tool call immediately
            await this.handleToolCall(opts.sessionId, chunk.toolCall);
            break;
          case 'usage':
            this.logger.debug('Token usage', {
              sessionId: opts.sessionId,
              inputTokens: chunk.inputTokens,
              outputTokens: chunk.outputTokens
            });
            break;
        }
      }

      // Update session with final response
      await this.opts.sessionManager.updateSession(opts.sessionId, {
        content: content.join(''),
        toolCalls
      });

    } catch (error) {
      throw new MessageProcessError('Failed to process message', error as Error);
    }
  }

  private async buildSystemPrompt(): Promise<string> {
    const promptConfig = await this.opts.promptManager.getConfig();

    const instructions = promptConfig.instructions || '';

    // Build individual section configs
    const metadataConfig = promptConfig.includeWorkspaceMetadata ? {
      metadata: {
        workspaceName: this.opts.metadata.name,
        workspacePath: this.opts.metadata.path,
      }
    } : {};

    const systemConfig = promptConfig.includeSystemInfo ? {
      systemInfo: {
        os: process.platform,
        arch: process.arch,
        cwd: this.opts.metadata.path,
      }
    } : {};

    const dateConfig = promptConfig.includeDateTime ? {
      dateConfig: {
        includeTime: true
      }
    } : {};

    // Build tools config if MCP manager exists
    const toolsConfig = this.opts.mcpManager ? {
      tools: {
        tools: (await this.opts.mcpManager.listAllTools()).map(tool => ({
          ...tool,
          serverName: tool.server
        }))
      }
    } : {};

    // Build files config if files manager exists
    const filesConfig = this.opts.filesManager ? {
      files: {
        files: await this.opts.filesManager.list()
      }
    } : {};

    // Build dynamic context config if manager exists
    const dynamicConfig = this.opts.dynamicContextManager ? {
      dynamicContext: {
        dynamicContext: await this.getDynamicContext()
      }
    } : {};

    // Combine all configs
    const builderConfig: SystemPromptBuilderConfig = {
      instructions,
      ...metadataConfig,
      ...systemConfig,
      ...dateConfig,
      ...toolsConfig,
      ...filesConfig,
      ...dynamicConfig
    };

    const builder = new SystemPromptBuilder(builderConfig);
    return builder.buildPrompt();
  }

  async buildContext(sessionId: string): Promise<Context> {
    // Build system prompt which now includes all our context
    const systemPrompt = await this.buildSystemPrompt();

    // Get message history for the session
    const sessionHistory = await this.opts.sessionManager.renderSessionHistory(sessionId);

    const history = convertSessionToMessages(sessionHistory);
    return {
      systemPrompt,
      history
    };
  }

  private async getDynamicContext(): Promise<{ name: string; result: any }[]> {
    if (!this.opts.dynamicContextManager) {
      return [];
    }

    const configs = await this.opts.dynamicContextManager.list();

    // Execute each dynamic context tool call and format result
    const results = await Promise.all(
      configs.map(async config => {
        const result = await this.opts.mcpManager.invokeTool(
          config.serverId,
          config.methodName,
          config.params
        );

        return {
          name: `${config.serverId}/${config.methodName}`,  // Create meaningful name from config
          result: result // The tool call result
        };
      })
    );

    return results;
  }

  private async handleToolCall(sessionId: string, serverId: string, methodId: string, args: any): Promise<void> {
    try {
      this.logger.debug('Handling tool call', { 
        sessionId,
        tool: serverId,
        method: methodId,
        args: args
      });

      const response = await this.opts.mcpManager.invokeTool(
        serverId,
        methodId,
        args
      );

      this.logger.debug('Tool call completed', {
        sessionId,
        tool: serverId,
        method: methodId,
        response
      });

    } catch (error) {
      throw new ToolCallError(
        `Failed to handle tool call: ${serverId}.${methodId}`,
        error as Error
      );
    }
  }
}