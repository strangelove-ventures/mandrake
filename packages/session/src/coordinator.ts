import { 
  type Logger, 
  createLogger, 
  getTokenCounter, 
  getModelInfo, 
  type Message,
  tools
} from '@mandrake/utils';
import type { SessionCoordinatorOptions, Context } from './types';
import { MessageProcessError } from './errors';
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
        let resolveNext: ((value: IteratorResult<any, any>) => void) | null = null;
        let done = false;
        let removeListener: (() => void) | null = null;
        let lastError: Error | null = null;
        
        // Set up the turn update listener
        const setupListener = () => {
          try {
            removeListener = sessionManager.trackStreamingTurns(responseId, (turn) => {
              try {
                // Add the new turn to the buffer
                buffer.push(turn);
                
                // If someone is waiting for the next item, resolve their promise
                if (resolveNext) {
                  const next = resolveNext;
                  resolveNext = null;
                  next({ done: false, value: buffer.shift() } as IteratorResult<any, any>);
                }
                
                // Mark done when the last turn is completed
                // We check for completed status, which the session manager sets
                // when processing is completely done
                if (turn.status === 'completed') {
                  // Check if this is the final turn (no more tool calls will be made)
                  // Need to parse the toolCalls string to check
                  let hasToolCalls = false;
                  try {
                    // Handle both string and object formats for backward compatibility
                    const toolCallsData = typeof turn.toolCalls === 'string' 
                      ? JSON.parse(turn.toolCalls) 
                      : turn.toolCalls;
                    
                    // Check if we have a valid tool call with call data
                    hasToolCalls = !!(toolCallsData && toolCallsData.call && 
                                   Object.keys(toolCallsData.call).length > 0);
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
                      (next as any)({ done: true, value: undefined });
                      
                      // Remove the listener since we're done
                      if (removeListener) {
                        removeListener();
                        removeListener = null;
                      }
                    }
                  }
                }
              } catch (err) {
                lastError = err as Error;
                console.error('Error in turn update processing:', err);
              }
            });
          } catch (error) {
            lastError = error as Error;
            console.error('Error setting up turn update listener:', error);
          }
        };
        
        // Set up the listener right away
        setupListener();

        return {
          next(): Promise<IteratorResult<any, any>> {
            return new Promise((resolve) => {
              if (lastError) {
                // If we had an error, don't break the stream, log and continue
                console.error('Recovered from error in stream:', lastError);
                lastError = null;
                // Try to set up the listener again
                if (!removeListener) {
                  setupListener();
                }
              }

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
          
          return(): Promise<IteratorResult<any, any>> {
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
        completionPromise: completionPromise.catch(error => {
          // Log any errors during processing but don't rethrow
          // This prevents the connection from being terminated on errors
          this.logger.error('Error during request processing, but continuing', {
            sessionId,
            responseId: response.id,
            error: error instanceof Error ? error.message : String(error)
          });
        })
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
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!isComplete) {
        try {
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

          this.logger.debug('Process stream result', { 
            textLength: text.length, 
            toolCallsCount: toolCalls.length,
            isCompleted 
          });

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

              // Reset retry count after a successful tool call
              retryCount = 0;

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
          
        } catch (error) {
          this.logger.error('Error during request processing iteration', {
            sessionId,
            responseId,
            retryCount,
            error: error instanceof Error ? error.message : String(error)
          });
          
          retryCount++;
          
          if (retryCount >= maxRetries) {
            // Too many retries, mark the turn as completed with an error
            await this.opts.sessionManager.updateTurn(currentTurn.id, {
              content: `An error occurred while processing this request: ${error instanceof Error ? error.message : String(error)}`,
              status: 'completed',
              streamEndTime: Math.floor(Date.now() / 1000)
            });
            
            isComplete = true;
            throw error; // Rethrow to be caught by outer try/catch
          }
          
          // Wait a moment before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
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

  // Process a message stream and extract any tool calls using JSON Schema format
  private async processStreamForToolCalls(
    messageStream: AsyncIterable<any>,
    currentTurn: any
  ): Promise<{ text: string; toolCalls: any[]; isCompleted: boolean }> {
    let textBuffer = '';
    let jsonBuffer = '';
    let toolCalls = [];
    let isCompleted = false;
    
    // To avoid excessive parsing attempts, we'll track when we last tried to extract tool calls
    let lastExtractAttempt = 0;
    const MIN_EXTRACT_INTERVAL = 100; // milliseconds

    for await (const chunk of messageStream) {
      switch (chunk.type) {
        case 'text':
          textBuffer += chunk.text;
          jsonBuffer += chunk.text;

          // Strip any tool call JSON before updating content
          // Strip it right at the point of update to ensure it's always clean
          const cleanedContent = this.stripToolCallsJson(textBuffer);
          await this.opts.sessionManager.updateTurn(currentTurn.id, {
            rawResponse: textBuffer,
            content: cleanedContent
          });

          // Rate limit the tool call extraction attempts
          const now = Date.now();
          if (now - lastExtractAttempt >= MIN_EXTRACT_INTERVAL) {
            lastExtractAttempt = now;
            
            // Check for potential JSON objects that might be tool calls
            if (jsonBuffer.includes('{') && jsonBuffer.includes('}')) {
              // Look for complete tool calls using the simplified format parser
              try {
                this.logger.debug('Attempting to extract tool calls from JSON buffer');
                const parsedToolCalls = tools.extractParsedToolCalls(jsonBuffer);
                this.logger.debug('Parsed tool calls result', { count: parsedToolCalls.length });
                
                if (parsedToolCalls.length > 0) {
                  // If we found tool calls, transform them into our internal format
                  try {
                    const internalToolCalls = parsedToolCalls.map(call => ({
                      serverName: call.serverName,
                      methodName: call.methodName,
                      arguments: call.arguments
                    }));
                    
                    if (internalToolCalls.length > 0) {
                      // Final cleanup of content before returning
                      // This ensures tool call JSON is removed from displayed content
                      await this.opts.sessionManager.updateTurn(currentTurn.id, {
                        content: this.stripToolCallsJson(textBuffer)
                      });

                      this.logger.info('Found tool call', {
                        serverName: internalToolCalls[0].serverName,
                        methodName: internalToolCalls[0].methodName
                      });
                      toolCalls = internalToolCalls;
                      return { text: textBuffer, toolCalls, isCompleted: false };
                    }
                  } catch (error) {
                    // Just log and continue if there's an error transforming the tool calls
                    this.logger.debug("Error transforming tool calls", {
                      error: error instanceof Error ? error.message : String(error),
                      parsedCalls: parsedToolCalls.length
                    });
                  }
                }
              } catch (error) {
                // We'll just continue if there's an error extracting tool calls
                // This is likely just incomplete JSON
                this.logger.debug("Error extracting tool calls", {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
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

    // One final attempt to extract tool calls from the complete response
    this.logger.debug('Final attempt to extract tool calls');
    try {
      const parsedToolCalls = tools.extractParsedToolCalls(jsonBuffer);
      this.logger.debug('Final parsed tool calls result', { count: parsedToolCalls.length });
      
      if (parsedToolCalls.length > 0) {
        const internalToolCalls = parsedToolCalls.map(call => ({
          serverName: call.serverName,
          methodName: call.methodName,
          arguments: call.arguments
        }));
        
        if (internalToolCalls.length > 0) {
          // Final cleanup of content before returning
          // This ensures tool call JSON is removed from displayed content
          await this.opts.sessionManager.updateTurn(currentTurn.id, {
            content: this.stripToolCallsJson(textBuffer)
          });

          this.logger.info('Found tool call in final check', {
            serverName: internalToolCalls[0].serverName,
            methodName: internalToolCalls[0].methodName
          });
          toolCalls = internalToolCalls;
          return { text: textBuffer, toolCalls, isCompleted: false };
        }
      }
    } catch (error) {
      this.logger.debug("Error in final tool call extraction", {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // One final content cleanup
    // This ensures we don't have any leftover JSON fragments
    const finalCleanContent = this.stripToolCallsJson(textBuffer);
    await this.opts.sessionManager.updateTurn(currentTurn.id, {
      content: finalCleanContent
    });

    return { text: textBuffer, toolCalls: [], isCompleted: true };
  }

  // We no longer need extractCompleteToolCalls since we're using the JSON Schema parser

  // We no longer need parseCompleteToolCall since we're using the JSON Schema parser

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
  
  /**
   * Strips tool call JSON from text content
   * @param content Text that may contain tool call JSON
   * @returns Clean text with JSON removed
   */
  private stripToolCallsJson(content: string): string {
    if (!content) return '';
    
    // Regex to clean more aggressively
    // First, we'll find well-formed tool call JSON objects
    const fullJsonPattern = /\{\s*"name"\s*:\s*"[\w\.]+"[\s\S]*?"arguments"[\s\S]*?\}/g;
    
    // Then we'll also clean up any partial JSON or dangling brackets
    const partialJsonPattern = /\{\s*"name"[\s\S]*?(?:\}|$)/g; // Catch partial tool calls
    const danglingBracePattern = /\}\s*(?:\{[^\}]*)?$/g; // Catch dangling braces
    
    // Simpler pattern to catch isolated braces
    const isolatedBracePattern = /\s*\}\s*/g; // Catch isolated } characters
    
    // Apply all cleanings
    let cleanContent = content;
    cleanContent = cleanContent.replace(fullJsonPattern, '');
    cleanContent = cleanContent.replace(partialJsonPattern, '');
    cleanContent = cleanContent.replace(danglingBracePattern, '');
    cleanContent = cleanContent.replace(isolatedBracePattern, ' '); // Replace isolated braces with a space
    
    // Fix up whitespace and formatting
    cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n');  // Replace 3+ newlines with 2
    cleanContent = cleanContent.replace(/^\s+|\s+$/g, '');     // Trim leading/trailing whitespace
    cleanContent = cleanContent.replace(/([^\n])\s{2,}([^\n])/g, '$1 $2'); // Replace multiple spaces with single space (but preserve newlines)
    
    return cleanContent;
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

  async buildSystemPrompt(): Promise<string> {
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
