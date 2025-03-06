import { type Logger, createLogger, getTokenCounter, getModelInfo, type Message } from '@mandrake/utils';
import type { SessionCoordinatorOptions, Context } from './types';
import { ContextBuildError, MessageProcessError, ToolCallError } from './errors';
import { XmlTags } from './prompt/types';
import { setupProviderFromManager } from './utils/provider';
import { convertSessionToMessages } from './utils/messages';
import { type SystemPromptBuilderConfig, SystemPromptBuilder } from './prompt/builder';
import { StandardTrimStrategy } from './utils/trim';

export class SessionCoordinator {
  private logger: Logger;

  constructor(readonly opts: SessionCoordinatorOptions) {
    this.logger = opts.logger || createLogger('SessionCoordinator');
  }

  async cleanup(): Promise<void> {
    // We don't really do any cleanup yet but maybe want to later?
    this.logger.info('Cleaning up session coordinator');
  }
  
  /**
   * Handles a request and sets up a stream for real-time updates.
   * This method creates a request, sets up streaming, and returns everything needed to track the response.
   * 
   * @param sessionId The session ID
   * @param requestContent The user's request content
   * @returns Object containing the response ID, an async iterable of turns, and a promise that resolves when complete
   */
  async streamRequest(sessionId: string, requestContent: string): Promise<{
    responseId: string;
    stream: AsyncIterable<any>; // Use the Turn type from workspace package once available
    completionPromise: Promise<void>;
  }> {
    // Get response ID and completion promise from handleRequest
    const { responseId, completionPromise } = await this.handleRequest(sessionId, requestContent);
    
    // Create a turn stream using the session manager's tracking functionality
    const stream = this.createTurnStream(responseId);
    
    return {
      responseId,
      stream,
      completionPromise
    };
  }
  
  /**
   * Retrieves round data by response ID.
   * This is useful for getting the full round data after streaming is complete.
   * 
   * @param responseId The ID of the response to get the round for
   * @returns Promise resolving to the round data with request and response
   */
  async getRoundByResponseId(responseId: string): Promise<any> {
    try {
      // We need to first get the session ID for the response
      // Since we're looking across all sessions, we'll need to iterate through them
      // In a real production system, you'd want a more efficient query for this
      const sessions = await this.opts.sessionManager.listSessions();
      
      for (const session of sessions) {
        // For each session, get all rounds
        const rounds = await this.opts.sessionManager.listRounds(session.id);
        
        // Find the round that contains this response
        const round = rounds.find(r => r.responseId === responseId);
        
        // If found, return the round data
        if (round) {
          return this.opts.sessionManager.getRound(round.id);
        }
      }
      
      // If we get here, no round was found
      throw new Error(`No round found with response ID: ${responseId}`);
    } catch (error) {
      this.logger.error('Failed to get round by response ID', {
        responseId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Creates an async iterable stream of turn updates for a given response.
   * Uses the session manager's turn update tracking internally.
   * 
   * @param responseId The response ID to stream turns for
   * @returns An async iterable that yields turn updates as they occur
   */
  private createTurnStream(responseId: string): AsyncIterable<any> {
    const sessionManager = this.opts.sessionManager;
    
    return {
      [Symbol.asyncIterator]() {
        let buffer: any[] = [];
        let resolveNext: ((value: IteratorResult<any>) => void) | null = null;
        let done = false;
        let removeListener: (() => void) | null = null;
        
        // Set up the turn update listener
        const setupListener = () => {
          removeListener = sessionManager.trackStreamingTurns(responseId, (turn) => {
            // Add the new turn to the buffer
            buffer.push(turn);
            
            // If someone is waiting for the next item, resolve their promise
            if (resolveNext) {
              const next = resolveNext;
              resolveNext = null;
              next({ done: false, value: buffer.shift() });
            }
            
            // Mark done when the last turn is completed
            // We check for completed status, which the session manager sets
            // when processing is completely done
            if (turn.status === 'completed') {
              // Check if this is the final turn (no more tool calls will be made)
              // Need to parse the toolCalls string to check
              let hasToolCalls = false;
              try {
                const toolCallsObj = JSON.parse(turn.toolCalls);
                hasToolCalls = !!(toolCallsObj && toolCallsObj.call && 
                                 Object.keys(toolCallsObj.call).length > 0);
              } catch (e) {
                // If we can't parse, assume no tool calls
                hasToolCalls = false;
              }
              
              // If this turn has no tool calls or is the last in a series,
              // we can finish streaming
              if (!hasToolCalls) {
                done = true;
                
                // If someone is waiting and buffer is empty, resolve with done
                if (resolveNext && buffer.length === 0) {
                  const next = resolveNext;
                  resolveNext = null;
                  next({ done: true, value: undefined });
                  
                  // Remove the listener since we're done
                  if (removeListener) {
                    removeListener();
                    removeListener = null;
                  }
                }
              }
            }
          });
        };
        
        // Set up the listener right away
        setupListener();
        
        return {
          next(): Promise<IteratorResult<any>> {
            return new Promise((resolve) => {
              // If we have items in the buffer, return the next one
              if (buffer.length > 0) {
                resolve({ done: false, value: buffer.shift() });
                return;
              }
              
              // If we're done and buffer is empty, we're done iterating
              if (done && buffer.length === 0) {
                if (removeListener) {
                  removeListener();
                  removeListener = null;
                }
                resolve({ done: true, value: undefined });
                return;
              }
              
              // Otherwise, wait for the next update
              resolveNext = resolve;
            });
          },
          
          return(): Promise<IteratorResult<any>> {
            // Clean up when the iterator is closed early
            if (removeListener) {
              removeListener();
              removeListener = null;
            }
            done = true;
            buffer = [];
            resolveNext = null;
            return Promise.resolve({ done: true, value: undefined });
          }
        };
      }
    };
  }

  /**
   * Handles a user request and returns the response ID along with a promise that resolves when processing completes.
   * This allows consumers to know the response ID immediately for streaming while also being able to await completion.
   * 
   * @param sessionId The session ID
   * @param requestContent The user's request content
   * @returns An object with the response ID and a completion promise
   */
  async handleRequest(sessionId: string, requestContent: string): Promise<{
    responseId: string;
    completionPromise: Promise<void>;
  }> {
    try {
      // Create round and initial response right away
      const { response } = await this.opts.sessionManager.createRound({
        sessionId,
        content: requestContent
      });

      // Start processing in the background and return a promise
      const completionPromise = this._processRequest(sessionId, requestContent, response.id);
      
      // Return the response ID immediately with the completion promise
      return {
        responseId: response.id,
        completionPromise
      };
    } catch (error) {
      this.logger.error('Failed to create round for request', {
        sessionId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause ? (error as any).cause.message : undefined
        } : String(error)
      });
      throw new MessageProcessError('Failed to create round for request', error as Error);
    }
  }
  
  /**
   * Internal method that handles the actual processing of a request.
   * Extracted from handleRequest to allow returning the response ID early.
   * 
   * @param sessionId The session ID
   * @param requestContent The user's request content
   * @param responseId The response ID (from createRound)
   */
  private async _processRequest(sessionId: string, requestContent: string, responseId: string): Promise<void> {
    try {
      const provider = await setupProviderFromManager(this.opts.modelsManager);
      this.logger.debug('Created provider for request', { sessionId });

      // Build context
      const context = await this.buildContext(sessionId);
      this.logger.debug('Built context for request', { sessionId });

      // Get the initial context including the system prompt and history
      // We'll use this as a starting point
      const conversationHistory = [...context.history];
      
      // We need to ensure the user's request is the last message in the history
      // If the last message is already from the user, we'll keep it
      // Otherwise we need to add the current user message
      if (conversationHistory.length === 0 || 
          conversationHistory[conversationHistory.length - 1].role !== 'user') {
        conversationHistory.push({ role: 'user', content: requestContent });
      }

      let currentTurn = await this.opts.sessionManager.createTurn({
        responseId: responseId,
        content: '',
        rawResponse: '',
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0
      });

      let isComplete = false;
      while (!isComplete) {
        this.logger.info('Sending message to provider', {
          historyLength: conversationHistory.length,
          lastRole: conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].role : 'none'
        });

        const messageStream = provider.createMessage(
          context.systemPrompt,
          conversationHistory as Message[]
        );

        const {
          text,
          toolCalls,
          isCompleted
        } = await this.processStreamForToolCalls(messageStream, currentTurn);

        if (toolCalls.length > 0) {
          const tool = toolCalls[0];

          this.logger.info('FOUND_TOOL_CALL', {
            server: tool.serverName,
            method: tool.methodName
          });

          await this.opts.sessionManager.updateTurn(currentTurn.id, {
            toolCalls: {
              call: {
                serverName: tool.serverName,
                methodName: tool.methodName,
                arguments: tool.arguments
              },
              response: null
            },
            status: 'completed',
            streamEndTime: Math.floor(Date.now() / 1000)
          });

          try {
            this.logger.info('EXECUTING_TOOL', {
              server: tool.serverName,
              method: tool.methodName
            });

            const result = await this.executeToolCall(
              sessionId,
              tool.serverName,
              tool.methodName,
              tool.arguments
            );

            await this.opts.sessionManager.updateTurn(currentTurn.id, {
              toolCalls: {
                call: {
                  serverName: tool.serverName,
                  methodName: tool.methodName,
                  arguments: tool.arguments
                },
                response: result
              }
            });
            
            // After completing a tool call, get the updated conversation history
            // that includes the tool call and response
            const updatedHistory = await this.opts.sessionManager.renderSessionHistory(sessionId);
            const updatedConversation = convertSessionToMessages(updatedHistory);
            
            // Replace our in-memory conversation with the updated version
            conversationHistory.length = 0;
            updatedConversation.forEach(msg => conversationHistory.push(msg));

          } catch (error) {
            this.logger.error('TOOL_EXECUTION_ERROR', {
              server: tool.serverName,
              method: tool.methodName,
              error: (error as Error).message
            });

            await this.opts.sessionManager.updateTurn(currentTurn.id, {
              toolCalls: {
                call: {
                  serverName: tool.serverName,
                  methodName: tool.methodName,
                  arguments: tool.arguments
                },
                response: {
                  error: (error as Error).message
                }
              }
            });
            
            // After completing a tool call (even with error), get the updated conversation history
            // that includes the tool call and error
            const updatedHistory = await this.opts.sessionManager.renderSessionHistory(sessionId);
            const updatedConversation = convertSessionToMessages(updatedHistory);
            
            // Replace our in-memory conversation with the updated version
            conversationHistory.length = 0;
            updatedConversation.forEach(msg => conversationHistory.push(msg));
          }

          // Create a new turn for the next part of the conversation
          currentTurn = await this.opts.sessionManager.createTurn({
            responseId: responseId,
            content: '',
            rawResponse: '',
            inputTokens: 0,
            outputTokens: 0,
            inputCost: 0,
            outputCost: 0
          });

          this.logger.debug('NEW_TURN_CREATED', { turnId: currentTurn.id });

        } else {
          await this.opts.sessionManager.updateTurn(currentTurn.id, {
            status: 'completed',
            streamEndTime: Math.floor(Date.now() / 1000)
          });
          
          // For the final turn, update our history from the database
          const updatedHistory = await this.opts.sessionManager.renderSessionHistory(sessionId);
          const updatedConversation = convertSessionToMessages(updatedHistory);
          
          // Since this is the last turn, we don't need to update our conversation history
          // as we're about to exit the loop

          isComplete = true;
        }
      }

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

  // Process a message stream and extract any tool calls
  private async processStreamForToolCalls(
    messageStream: AsyncIterable<any>,
    currentTurn: any
  ): Promise<{ text: string; toolCalls: any[]; isCompleted: boolean }> {
    let textBuffer = '';
    let xmlBuffer = '';
    let toolCalls = [];
    let isCompleted = false;

    for await (const chunk of messageStream) {
      switch (chunk.type) {
        case 'text':
          textBuffer += chunk.text;
          xmlBuffer += chunk.text;

          await this.opts.sessionManager.updateTurn(currentTurn.id, {
            rawResponse: textBuffer,
            content: textBuffer
          });

          if (xmlBuffer.includes('<tool_call>') && xmlBuffer.includes('</tool_call>')) {
            const { tools, remaining } = this.extractCompleteToolCalls(xmlBuffer);
            xmlBuffer = remaining;

            if (tools.length > 0) {
              toolCalls = tools;
              return { text: textBuffer, toolCalls, isCompleted: false };
            }
          }
          break;

        case 'done':
          isCompleted = true;
          break;

        case 'usage':
          await this.opts.sessionManager.updateTurn(currentTurn.id, {
            inputTokens: chunk.inputTokens,
            outputTokens: chunk.outputTokens,
            inputCost: 0,
            outputCost: 0
          });
          break;
      }
    }

    return { text: textBuffer, toolCalls: [], isCompleted: true };
  }

  private extractCompleteToolCalls(content: string): { tools: any[], remaining: string } {
    const result = {
      tools: [] as Array<{ serverName: string, methodName: string, arguments: any }>,
      remaining: content
    };

    const tagStart = '<tool_call>';
    const tagEnd = '</tool_call>';

    let startIndex = content.indexOf(tagStart);

    if (startIndex === -1) {
      return result;
    }

    while (startIndex !== -1) {
      const endIndex = content.indexOf(tagEnd, startIndex);

      if (endIndex === -1) {
        return result;
      }

      const completeToolCall = content.substring(startIndex, endIndex + tagEnd.length);

      this.logger.debug("COMPLETE_TOOL_CALL_FOUND", {
        length: completeToolCall.length,
        snippet: completeToolCall.substring(0, 50) + "..."
      });

      try {
        // Try to parse the tool call
        const parsed = this.parseCompleteToolCall(completeToolCall);
        if (parsed) {
          result.tools.push(parsed);
        }
      } catch (error) {
        this.logger.error("PARSE_TOOL_CALL_ERROR", error as Error);
      }

      // Remove this tool call from the content for the next search
      content = content.substring(0, startIndex) + content.substring(endIndex + tagEnd.length);

      // Look for more tool calls
      startIndex = content.indexOf(tagStart);
    }

    result.remaining = content;
    return result;
  }

  // Parse a complete tool call XML string
  private parseCompleteToolCall(xml: string): { serverName: string, methodName: string, arguments: any } | null {
    this.logger.debug("PARSING_TOOL_CALL", { xmlLength: xml.length });

    // Extract server
    const serverMatch = xml.match(/<server>(.*?)<\/server>/s);
    if (!serverMatch) {
      this.logger.debug("NO_SERVER_MATCH");
      return null;
    }

    // Extract method
    const methodMatch = xml.match(/<method>(.*?)<\/method>/s);
    if (!methodMatch) {
      this.logger.debug("NO_METHOD_MATCH");
      return null;
    }

    // Extract arguments - use careful regex to handle nested JSON
    const argsMatch = xml.match(/<arguments>\s*([\s\S]*?)\s*<\/arguments>/s);
    if (!argsMatch) {
      this.logger.debug("NO_ARGS_MATCH");
      return null;
    }

    this.logger.debug("EXTRACTED_PARTS", {
      server: serverMatch[1],
      method: methodMatch[1],
      argsLength: argsMatch[1].length
    });

    try {
      // Parse the arguments as JSON
      const args = JSON.parse(argsMatch[1]);

      return {
        serverName: serverMatch[1],
        methodName: methodMatch[1],
        arguments: args
      };
    } catch (error) {
      this.logger.error("ARGS_PARSE_ERROR", error as Error);
      return null;
    }
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

  async buildContext(sessionId: string): Promise<Context> {
    // Build system prompt which now includes all our context
    const systemPrompt = await this.buildSystemPrompt();

    // Get the active model ID
    const activeModelId = await this.opts.modelsManager.getActive();
    if (!activeModelId) {
      throw new Error('No active model configured');
    }
    
    // Get the model configuration
    const modelConfig = await this.opts.modelsManager.getModel(activeModelId);
    
    // Get provider configuration
    const providerConfig = await this.opts.modelsManager.getProvider(modelConfig.providerId);
    
    // Get detailed model info from the utils package
    const modelInfo = getModelInfo(providerConfig.type, modelConfig.modelId);
    
    // Default to a large context window if model info is not available
    const contextWindow = modelInfo?.contextWindow || 100000;
    
    // Get appropriate token counter
    const tokenCounter = getTokenCounter(providerConfig.type, modelConfig.modelId);
    
    // Define safety buffer (tokens we reserve for safety margin)
    const safetyBuffer = 50;
    
    // Create trim strategy
    const trimStrategy = new StandardTrimStrategy();

    // Get message history for the session with token limiting
    const sessionHistory = await this.opts.sessionManager.renderSessionHistory(sessionId);
    
    // Convert and trim history, accounting for system prompt and safety buffer
    const history = convertSessionToMessages(sessionHistory, {
      maxTokens: contextWindow,
      tokenCounter,
      trimStrategy,
      systemPrompt,
      safetyBuffer
    });
    
    return {
      systemPrompt,
      history
    };
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
