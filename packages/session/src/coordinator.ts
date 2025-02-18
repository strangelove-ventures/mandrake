import type { Logger } from '@mandrake/utils';
import { createLogger } from '@mandrake/utils';
import type { SessionCoordinatorOptions, MessageOptions, Context } from './types';
import { ContextBuildError, MessageProcessError, ToolCallError } from './errors';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createProvider } from '@mandrake/provider';
import type { ProviderID } from '@mandrake/provider';

export class SessionCoordinator {
  private logger: Logger;

  constructor(private readonly opts: SessionCoordinatorOptions) {
    this.logger = opts.logger || createLogger('SessionCoordinator');
  }

  async handleMessage(opts: MessageOptions): Promise<void> {
    try {
      // Get active model and provider
      const modelName = await this.opts.modelsManager.getActive();
      if (!modelName) {
        throw new Error('No active model found');
      }
      
      const model = await this.opts.modelsManager.getModel(modelName);
      if (!model.enabled) {
        throw new Error('Active model is disabled');
      }

      const providerConfig = await this.opts.modelsManager.getProvider(model.providerId);
      this.logger.debug('Got provider for model', { 
        modelName, 
        provider: model.providerId 
      });

      const provider = createProvider(model.providerId as ProviderID, providerConfig);

      // Build context for request
      const context = await this.buildContext(opts.sessionId);
      this.logger.debug('Built context for request', { sessionId: opts.sessionId });

      // Create provider message stream
      const messageStream = await provider.createMessage(
        this.buildSystemPrompt(context),
        [{ role: 'user', content: opts.request }]
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

      // Handle tool calls if any
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          await this.handleToolCall(opts.sessionId, toolCall);
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

  private buildSystemPrompt(context: Context): string {
    // Combine prompt config with context to build final system prompt
    const { systemPrompt: config } = context;
    
    const sections: string[] = [];
    sections.push(config.instructions);

    if (config.includeWorkspaceMetadata) {
      // Add workspace metadata section
    }

    if (config.includeSystemInfo) {
      // Add system info section
    }

    if (config.includeDateTime) {
      // Add date/time section
    }

    return sections.join('\n\n');
  }

  private async buildContext(sessionId: string): Promise<Context> {
    try {
      // Get all required context in parallel
      const [
        systemPrompt,
        tools,
        files,
        dynamicContext,
        session
      ] = await Promise.all([
        this.opts.promptManager.getConfig(),
        this.opts.mcpManager.listTools(),
        this.opts.filesManager?.listFiles() || Promise.resolve([]),
        this.getDynamicContext(),
        this.opts.sessionManager.getSession(sessionId)
      ]);

      return {
        systemPrompt,
        tools,
        files,
        dynamicContext,
        history: [session]
      };
    } catch (error) {
      throw new ContextBuildError('Failed to build context', error as Error);
    }
  }

  private async getDynamicContext(): Promise<CallToolResult[]> {
    if (!this.opts.dynamicContextManager) {
      return [];
    }
    return this.opts.dynamicContextManager.getDynamicContext();
  }

  private async handleToolCall(sessionId: string, toolCall: any): Promise<void> {
    try {
      this.logger.debug('Handling tool call', { 
        sessionId,
        tool: toolCall.name,
        args: toolCall.arguments
      });

      const response = await this.opts.mcpManager.callTool(
        toolCall.name,
        toolCall.arguments
      );

      this.logger.debug('Tool call completed', {
        sessionId,
        tool: toolCall.name,
        response
      });

    } catch (error) {
      throw new ToolCallError(
        `Failed to handle tool call: ${toolCall.name}`,
        error as Error
      );
    }
  }
}