import { type Logger, createLogger } from '@mandrake/utils';
import type { SessionCoordinatorOptions, Context } from './types';
import { ContextBuildError, MessageProcessError, ToolCallError } from './errors';
import { XmlTags } from './prompt/types';
import { setupProviderFromManager } from './utils/provider';
import { convertSessionToMessages } from './utils/messages';
import { type SystemPromptBuilderConfig, SystemPromptBuilder } from './prompt/builder';

interface ParsedContent {
  tools: Array<{ serverName: string; methodName: string; arguments: any }>;
  content: string;
  remaining: string;
}

export class SessionCoordinator {
  private logger: Logger;

  constructor(private readonly opts: SessionCoordinatorOptions) {
    this.logger = opts.logger || createLogger('SessionCoordinator');
  }

  async handleRequest(sessionId: string, requestContent: string): Promise<void> {
    try {
      // Setup provider
      const provider = await setupProviderFromManager(this.opts.modelsManager);
      this.logger.info('Created provider for request', { sessionId });

      // Build context
      const context = await this.buildContext(sessionId);
      this.logger.info('Built context for request', { sessionId });

      // Create round and initial response
      const { response } = await this.opts.sessionManager.createRound({
        sessionId,
        content: requestContent
      });

      // Initial empty turn
      let currentTurn = await this.opts.sessionManager.createTurn({
        responseId: response.id,
        content: [''],
        rawResponse: '',
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0
      });

      // Create provider message stream
      const messageStream = provider.createMessage(
        context.systemPrompt,
        [...context.history, { role: 'user', content: requestContent }]
      );

      // Process the message stream
      await this.processMessageStream(sessionId, response.id, currentTurn.id, messageStream);

    } catch (error) {
      this.logger.error('Failed to process request', {
        sessionId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause ? (error as any).cause.message : undefined
        } : String(error)
      });
      throw new MessageProcessError('Failed to process request', error as Error);
    }
  }

  // Process the message stream from the provider
  // Refactored processMessageStream method for SessionCoordinator
  private async processMessageStream(
    sessionId: string,
    responseId: string,
    initialTurnId: string,
    messageStream: AsyncIterable<any>
  ): Promise<void> {
    let currentTurnId = initialTurnId;
    let xmlBuffer = '';
    let textBuffer = '';
    let usageData = { inputTokens: 0, outputTokens: 0 };

    // Process each chunk
    for await (const chunk of messageStream) {
      switch (chunk.type) {
        case 'text':
          // Add text to buffers
          xmlBuffer += chunk.text;
          textBuffer += chunk.text;

          // Extract any complete tool calls
          const { tools, extractedContent, remaining } = this.extractToolCalls(xmlBuffer);
          xmlBuffer = remaining;

          // Update the current turn with new content
          await this.opts.sessionManager.updateTurn(currentTurnId, {
            rawResponse: textBuffer,
            content: this.splitContent(textBuffer),
          });

          // If we found tool calls
          if (tools.length > 0) {
            this.logger.debug('Found tool calls', { count: tools.length });

            // 1. Complete the current turn with the tool calls
            await this.opts.sessionManager.updateTurn(currentTurnId, {
              status: 'completed',
              streamEndTime: Math.floor(Date.now() / 1000),
              toolCalls: JSON.stringify(tools.map(tool => ({
                call: {
                  serverName: tool.serverName,
                  methodName: tool.methodName,
                  arguments: tool.arguments
                },
                result: null // Will be filled in after execution
              })))
            });

            // 2. Process each tool call and create a new turn for each one
            for (let i = 0; i < tools.length; i++) {
              const tool = tools[i];
              try {
                // Execute the tool
                const result = await this.executeToolCall(
                  sessionId,
                  tool.serverName,
                  tool.methodName,
                  tool.arguments
                );

                // Update the turn with the result
                const turn = await this.opts.sessionManager.getTurn(currentTurnId);
                const currentToolCalls = JSON.parse(turn.toolCalls);
                currentToolCalls[i].result = result;

                await this.opts.sessionManager.updateTurn(currentTurnId, {
                  toolCalls: JSON.stringify(currentToolCalls)
                });

                // 3. Create a new turn for the continuation after each tool call
                // This is crucial for maintaining the conversation flow
                const newTurn = await this.opts.sessionManager.createTurn({
                  responseId: responseId,
                  content: [''],
                  rawResponse: '',
                  inputTokens: usageData.inputTokens,
                  outputTokens: usageData.outputTokens,
                  inputCost: 0,
                  outputCost: 0
                });

                // Update the current turn ID and reset text buffer for new content
                currentTurnId = newTurn.id;
                textBuffer = '';
              } catch (error) {
                this.logger.error('Tool execution failed', {
                  tool: tool.serverName,
                  method: tool.methodName,
                  error
                });
              }
            }
          }
          break;

        case 'usage':
          // Update usage data
          usageData = {
            inputTokens: chunk.inputTokens,
            outputTokens: chunk.outputTokens
          };

          // Update the current turn with usage info
          await this.opts.sessionManager.updateTurn(currentTurnId, {
            inputTokens: chunk.inputTokens,
            outputTokens: chunk.outputTokens,
            inputCost: 0, // Calculate from provider rates
            outputCost: 0  // Calculate from provider rates
          });
          break;
      }
    }

    // Complete the final turn if needed
    const finalTurn = await this.opts.sessionManager.updateTurn(currentTurnId, {
      status: 'completed',
      streamEndTime: Math.floor(Date.now() / 1000)
    });
  }

  private async executeToolCall(
    sessionId: string,
    serverName: string,
    methodName: string,
    args: any
  ): Promise<any> {
    try {
      this.logger.debug('Executing tool call', {
        sessionId, serverName, methodName, args
      });

      const result = await this.opts.mcpManager.invokeTool(
        serverName,
        methodName,
        args
      );

      this.logger.debug('Tool call executed', {
        sessionId, serverName, methodName, result
      });

      return result;
    } catch (error) {
      this.logger.error('Tool call failed', {
        sessionId, serverName, methodName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private extractToolCalls(content: string): {
    tools: Array<{ serverName: string, methodName: string, arguments: any }>,
    extractedContent: string,
    remaining: string
  } {
    const result = {
      tools: [] as Array<{ serverName: string, methodName: string, arguments: any }>,
      extractedContent: '',
      remaining: ''
    };

    const tagStart = '<tool_call>';
    const tagEnd = '</tool_call>';

    let currentIndex = 0;

    while (true) {
      // Find next tool call
      const startIndex = content.indexOf(tagStart, currentIndex);
      if (startIndex === -1) {
        // No more tool calls
        result.extractedContent += content.slice(currentIndex);
        break;
      }

      // Add content before tool call
      result.extractedContent += content.slice(currentIndex, startIndex);

      // Look for end of tool call
      const endIndex = content.indexOf(tagEnd, startIndex);
      if (endIndex === -1) {
        // Incomplete tool call
        result.remaining = content.slice(currentIndex);
        break;
      }

      // Extract complete tool call
      const toolCallXml = content.slice(startIndex, endIndex + tagEnd.length);

      try {
        const parsed = this.parseToolCallXml(toolCallXml);
        if (parsed) {
          result.tools.push(parsed);

          // Include the tool call in extracted content
          result.extractedContent += toolCallXml;
        }
      } catch (error) {
        this.logger.warn('Failed to parse tool call', { error, xml: toolCallXml });

        // Include the tool call even if parsing failed
        result.extractedContent += toolCallXml;
      }

      // Move past this tool call
      currentIndex = endIndex + tagEnd.length;
    }

    return result;
  }

  private parseToolCallXml(xml: string): { serverName: string; methodName: string; arguments: any } | null {
    // Use regex with 's' flag to match across newlines
    const serverRegex = new RegExp(`<${XmlTags.SERVER}>(.*?)</${XmlTags.SERVER}>`, 's');
    const methodRegex = new RegExp(`<${XmlTags.METHOD}>(.*?)</${XmlTags.METHOD}>`, 's');
    const argsRegex = new RegExp(`<${XmlTags.ARGUMENTS}>([\s\S]*?)</${XmlTags.ARGUMENTS}>`, 's');

    const serverMatch = xml.match(serverRegex);
    const methodMatch = xml.match(methodRegex);
    const argsMatch = xml.match(argsRegex);

    if (!serverMatch || !methodMatch || !argsMatch) {
      this.logger.warn('Missing tags in tool call', {
        hasServer: !!serverMatch,
        hasMethod: !!methodMatch,
        hasArgs: !!argsMatch,
        xml
      });
      return null;
    }

    try {
      return {
        serverName: serverMatch[1].trim(),
        methodName: methodMatch[1].trim(),
        arguments: JSON.parse(argsMatch[1].trim())
      };
    } catch (error) {
      this.logger.warn('Failed to parse tool call arguments', { error, args: argsMatch[1] });
      return null;
    }
  }

  // Split content into an array for storage
  private splitContent(content: string): string[] {
    // Simple implementation - you can enhance this
    return content.split('').map(c => c === '' ? '' : c);
  }

  private async buildSystemPrompt(): Promise<string> {
    const promptConfig = await this.opts.promptManager.getConfig();

    const instructions = promptConfig.instructions || 'You are mandrake an ai assistant';

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

}