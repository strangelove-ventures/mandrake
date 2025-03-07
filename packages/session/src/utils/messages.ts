import type { TokenCounter, Message, SessionHistoryEntity} from '@mandrake/utils';
import type { } from '@mandrake/workspace';
import type { TrimStrategy } from './trim';
import { StandardTrimStrategy } from './trim';

/**
 * Format a tool call into XML
 */
export function formatToolCall(call: any): string {
  return `<tool_call>
<server>${call.serverName}</server>
<method>${call.methodName}</method>
<description>${call.description || ''}</description>
<arguments>
${JSON.stringify(call.arguments, null, 2)}
</arguments>
</tool_call>`;
}

/**
 * Format a tool result into XML
 */
export function formatToolResult(result: any): string {
  return `<tool_result>
<result>
${JSON.stringify(result, null, 2)}
</result>
</tool_result>`;
}

/**
 * Format a tool error into XML
 */
export function formatToolError(error: any): string {
  return `<tool_result>
<error>
${JSON.stringify(error, null, 2)}
</error>
</tool_result>`;
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
              // Add the tool call XML
              assistantContent += formatToolCall({
                serverName: toolCallsData.call.serverName,
                methodName: toolCallsData.call.methodName,
                description: toolCallsData.call.description || '',
                arguments: toolCallsData.call.arguments
              });
              
              // Add the tool result XML
              if (toolCallsData.response) {
                if (toolCallsData.response.error) {
                  assistantContent += formatToolError(toolCallsData.response);
                } else {
                  assistantContent += formatToolResult(toolCallsData.response);
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
