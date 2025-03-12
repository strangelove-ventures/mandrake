import type { TokenCounter, Message, SessionHistoryEntity} from '@mandrake/utils';
import { tools } from '@mandrake/utils';
import type { } from '@mandrake/workspace';
import type { TrimStrategy } from './trim';
import { StandardTrimStrategy } from './trim';

/**
 * Format a tool call into JSON Schema format
 */
export function formatToolCall(call: any): string {
  return tools.formatToolCall({
    serverName: call.serverName,
    methodName: call.methodName,
    arguments: call.arguments,
    fullName: `${call.serverName}.${call.methodName}`
  });
}

/**
 * Format a tool result into JSON Schema format
 */
export function formatToolResult(call: any, result: any): string {
  return tools.formatToolResult({
    serverName: call.serverName,
    methodName: call.methodName,
    arguments: call.arguments,
    fullName: `${call.serverName}.${call.methodName}`
  }, result);
}

/**
 * Format a tool error into JSON Schema format
 */
export function formatToolError(call: any, error: any): string {
  return tools.formatToolError({
    serverName: call.serverName,
    methodName: call.methodName,
    arguments: call.arguments,
    fullName: `${call.serverName}.${call.methodName}`
  }, error);
}

/**
 * Convert a session history to a list of messages suitable for sending to a provider
 * @param history Session history from the database
 * @param options Options for token limiting and trimming
 * @returns Array of messages for the provider
 */
export function convertSessionToMessages(
  history: SessionHistoryEntity,
  options?: {
    maxTokens?: number,
    tokenCounter?: TokenCounter,
    trimStrategy?: TrimStrategy,
    systemPrompt?: string, // Add system prompt to consider its tokens
    safetyBuffer?: number  // Optional buffer for safety
  }
): Message[] {
  const messages: Message[] = [];
  
  for (const round of history.rounds) {
    // Add user message
    messages.push({
      role: 'user',
      content: round.request.content
    });

    // Process response turns and build a single assistant message for the entire round
    if (round.response.turns.length > 0) {
      let assistantContent = '';

      for (const turn of round.response.turns) {
        // Add content from turn
        if (turn.content) {
          try {
            // The content is stored as a JSON string of an array of content segments
            let contentObj;
            try {
              contentObj = JSON.parse(turn.content);
              if (Array.isArray(contentObj)) {
                contentObj = contentObj.join('');
              }
            } catch {
              // If it's not valid JSON, use as is
              contentObj = turn.content;
            }

            const content = typeof contentObj === 'string' ? contentObj.trim() : JSON.stringify(contentObj).trim();
            if (content) {
              assistantContent += content;
            }
          } catch (e) {
            console.error('Error parsing turn content:', e);
          }
        }

        // Add tool calls and results if present
        if (turn.toolCalls) {
          try {
            const toolCallsData = typeof turn.toolCalls === 'string' ? JSON.parse(turn.toolCalls) : turn.toolCalls;
            
            // Handle the case where we have a call and response
            if (toolCallsData.call && toolCallsData.call.serverName && toolCallsData.call.methodName) {
              // Create the parsed tool call structure
              const callObj = {
                serverName: toolCallsData.call.serverName,
                methodName: toolCallsData.call.methodName,
                description: toolCallsData.call.description || '',
                arguments: toolCallsData.call.arguments
              };
              
              // Add the tool call in JSON format
              assistantContent += formatToolCall(callObj);
              
              // Add the tool result in JSON format
              if (toolCallsData.response) {
                if (toolCallsData.response.error) {
                  assistantContent += formatToolError(callObj, toolCallsData.response.error);
                } else {
                  assistantContent += formatToolResult(callObj, toolCallsData.response);
                }
              }
            }
          } catch (e) {
            console.error('Error parsing tool calls:', e);
          }
        }
      }

      if (assistantContent) {
        messages.push({
          role: 'assistant',
          content: assistantContent.trim()
        });
      }
    }
  }

  if (options?.maxTokens && options?.tokenCounter) {
    let availableTokens = options.maxTokens;
    
    // Subtract system prompt tokens if provided
    if (options.systemPrompt) {
      const systemTokens = options.tokenCounter.countTokens(options.systemPrompt);
      availableTokens -= systemTokens;
    }
    
    // Subtract safety buffer if provided
    if (options.safetyBuffer) {
      availableTokens -= options.safetyBuffer;
    }
    
    // Ensure we have at least some tokens available
    availableTokens = Math.max(availableTokens, 0);
    
    const strategy = options.trimStrategy || new StandardTrimStrategy();
    return strategy.trimToFit(messages, availableTokens, options.tokenCounter);
  }
  
  return messages;
}
