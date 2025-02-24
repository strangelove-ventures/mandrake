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
  async handleMessage(sessionId: string, request: string): Promise<void> {
    try {
      // Setup provider using our new util
      const provider = await setupProviderFromManager(this.opts.modelsManager);
      this.logger.info('Created provider for request', { sessionId });

      // Build context for request 
      const context = await this.buildContext(sessionId);
      this.logger.info('Built context for request', { sessionId });

      // Create round and response for this request
      const { response } = await this.opts.sessionManager.createRound({
        sessionId,
        content: request
      });

      // Create initial turn
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
        [...context.history, { role: 'user', content: request }]
      );

      // Buffer for accumulating XML content
      let xmlBuffer = '';

      // Process message stream
      for await (const chunk of messageStream) {
        switch (chunk.type) {
          case 'text':
            // Add to XML buffer for parsing
            xmlBuffer += chunk.text;

            // Try to parse complete tool calls
            const { tools, content, remaining } = this.parseContent(xmlBuffer);
            xmlBuffer = remaining;

            // Update raw response and content if we have non-tool text
            if (content) {
              currentTurn = await this.opts.sessionManager.updateTurn(currentTurn.id, {
                rawResponse: currentTurn.rawResponse + content,
                content: [...JSON.parse(currentTurn.content), content]
              });
            }

            // Handle any complete tool calls
            if (tools.length > 0) {
              this.logger.debug('Found tool calls in response', {
                count: tools.length,
                firstTool: {
                  server: tools[0].serverName,
                  method: tools[0].methodName
                }
              });

              currentTurn = await this.opts.sessionManager.updateTurn(currentTurn.id, {
                toolCalls: [JSON.stringify(tools)], // Ensure proper JSON stringification 
                status: 'completed',
                streamEndTime: Math.floor(Date.now() / 1000)
              });

              // Execute tools
              for (const tool of tools) {
                await this.handleToolCall(
                  sessionId,
                  tool.serverName,
                  tool.methodName,
                  tool.arguments
                );
              }

              // Create new turn for continuation
              currentTurn = await this.opts.sessionManager.createTurn({
                responseId: response.id,
                content: [''],
                rawResponse: '',
                inputTokens: 0,
                outputTokens: 0,
                inputCost: 0,
                outputCost: 0
              });
            }
            break;

          case 'usage':
            // Update turn with usage info
            currentTurn = await this.opts.sessionManager.updateTurn(currentTurn.id, {
              inputTokens: chunk.inputTokens,
              outputTokens: chunk.outputTokens,
              inputCost: provider.calculateCost(chunk.inputTokens, 0),
              outputCost: provider.calculateCost(0, chunk.outputTokens)
            });
            break;
        }
      }

      // Complete final turn if not already completed by tool call
      if (currentTurn.status === 'streaming') {
        await this.opts.sessionManager.updateTurn(currentTurn.id, {
          status: 'completed',
          streamEndTime: Math.floor(Date.now() / 1000)
        });
      }

    } catch (error) {
      this.logger.error('Failed to process message', {
        sessionId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause ? (error as any).cause.message : undefined
        } : String(error)
      });
      throw new MessageProcessError('Failed to process message', error as Error);
    }
  }

  // In coordinator.ts, enhance the parseContent method:
  private parseContent(content: string): ParsedContent {
    this.logger.debug('Parsing content for tool calls', {
      contentLength: content.length,
      snippet: content.length > 100 ? content.substring(0, 100) + '...' : content
    });

    const result: ParsedContent = {
      tools: [],
      content: '',
      remaining: ''
    };

    // Look for start of tool call
    const tagStart = '<tool_call>';
    const tagEnd = '</tool_call>';

    this.logger.debug('Looking for tool tags', {
      tagStartIndex: content.indexOf(tagStart),
      tagEndIndex: content.indexOf(tagEnd)
    });

    let currentIndex = 0;
    while (true) {
      // Find next tool call start
      const startIndex = content.indexOf(tagStart, currentIndex);
      if (startIndex === -1) {
        // No more tool calls found
        result.content += content.slice(currentIndex);
        break;
      }

      // Add any content before the tool call
      if (startIndex > currentIndex) {
        result.content += content.slice(currentIndex, startIndex);
      }

      // Look for end of this tool call
      const endIndex = content.indexOf(tagEnd, startIndex);
      if (endIndex === -1) {
        // Incomplete tool call, save remaining content and stop
        result.remaining = content.slice(currentIndex);
        this.logger.debug('Found incomplete tool call', {
          startIndex,
          currentIndex,
          partialToolCall: content.slice(startIndex, Math.min(startIndex + 200, content.length))
        });
        break;
      }

      // Extract the full tool call XML
      const toolCallXml = content.slice(startIndex, endIndex + tagEnd.length);
      this.logger.debug('Found tool call XML', { toolCallXml });

      try {
        // Parse the tool call XML
        const parsed = this.parseToolCall(toolCallXml);
        if (parsed) {
          result.tools.push(parsed);
          this.logger.debug('Successfully parsed tool call', {
            serverName: parsed.serverName,
            methodName: parsed.methodName
          });
        } else {
          this.logger.warn('Failed to parse tool call: returned null', { toolCallXml });
        }
      } catch (error) {
        this.logger.warn('Failed to parse tool call XML', {
          error,
          xml: toolCallXml
        });
      }

      // Move index past this tool call
      currentIndex = endIndex + tagEnd.length;
    }

    this.logger.debug('Finished parsing content', {
      foundTools: result.tools.length,
      contentLength: result.content.length,
      remainingLength: result.remaining.length
    });

    return result;
  }

  // Also enhance the parseToolCall method:
  // Assuming parseToolCall looks something like this in coordinator.ts
  private parseToolCall(xml: string): { serverName: string; methodName: string; arguments: any } | null {
    // Create regex patterns with the XmlTags constants but add the /s modifier
    const serverRegex = new RegExp(`<${XmlTags.SERVER}>(.*?)</${XmlTags.SERVER}>`, 's');
    const methodRegex = new RegExp(`<${XmlTags.METHOD}>(.*?)</${XmlTags.METHOD}>`, 's');
    const argsRegex = new RegExp(`<${XmlTags.ARGUMENTS}>([\s\S]*?)</${XmlTags.ARGUMENTS}>`, 's');

    // Match patterns
    const serverMatch = xml.match(serverRegex);
    if (!serverMatch) {
      this.logger.warn('Missing server tag in tool call', { xml });
      return null;
    }

    const methodMatch = xml.match(methodRegex);
    if (!methodMatch) {
      this.logger.warn('Missing method tag in tool call', { xml });
      return null;
    }

    const argsMatch = xml.match(argsRegex);
    if (!argsMatch) {
      this.logger.warn('Missing arguments tag in tool call', { xml });
      return null;
    }

    try {
      const argsJson = argsMatch[1].trim();
      const args = JSON.parse(argsJson);
      return {
        serverName: serverMatch[1].trim(),
        methodName: methodMatch[1].trim(),
        arguments: args
      };
    } catch (error) {
      this.logger.warn('Failed to parse tool call arguments', {
        error: error instanceof Error ? error.message : String(error),
        args: argsMatch[1]
      });
      return null;
    }
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