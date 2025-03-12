/**
 * Tool calling formatter utilities
 */
import type { ParsedToolCall, ToolCall, ToolResult } from './types';

/**
 * Formats a tool call into a JSON string
 * @param parsedCall The parsed tool call to format
 * @returns Formatted tool call JSON string
 */
export function formatToolCall(parsedCall: ParsedToolCall): string {
  const toolCall: ToolCall = {
    name: `${parsedCall.serverName}.${parsedCall.methodName}`,
    arguments: parsedCall.arguments
  };

  return JSON.stringify({ tool_calls: [toolCall] }, null, 2);
}

/**
 * Formats a successful tool result into a JSON string
 * @param parsedCall The parsed tool call that was executed
 * @param result The result of the tool execution
 * @returns Formatted tool result JSON string
 */
export function formatToolResult(parsedCall: ParsedToolCall, result: any): string {
  const toolResult: ToolResult = {
    name: `${parsedCall.serverName}.${parsedCall.methodName}`,
    content: result
  };

  return JSON.stringify({ tool_results: [toolResult] }, null, 2);
}

/**
 * Formats a tool error into a JSON string
 * @param parsedCall The parsed tool call that resulted in an error
 * @param error The error that occurred
 * @returns Formatted tool error JSON string
 */
export function formatToolError(parsedCall: ParsedToolCall, error: any): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const toolResult: ToolResult = {
    name: `${parsedCall.serverName}.${parsedCall.methodName}`,
    error: errorMessage
  };

  return JSON.stringify({ tool_results: [toolResult] }, null, 2);
}

/**
 * Formats a tool call with its corresponding result or error
 * @param parsedCall The parsed tool call
 * @param result The result or error from executing the tool
 * @param isError Whether the result is an error
 * @returns Formatted tool call and result as a string
 */
export function formatToolCallAndResult(
  parsedCall: ParsedToolCall, 
  result: any, 
  isError = false
): string {
  const toolCallStr = formatToolCall(parsedCall);
  
  const resultStr = isError 
    ? formatToolError(parsedCall, result)
    : formatToolResult(parsedCall, result);
  
  return `${toolCallStr}\n\n${resultStr}`;
}

/**
 * Creates a markdown-formatted representation of a tool call for display
 * @param parsedCall The parsed tool call
 * @returns Markdown string representing the tool call
 */
export function formatToolCallMarkdown(parsedCall: ParsedToolCall): string {
  return `**Tool Call:** \`${parsedCall.serverName}.${parsedCall.methodName}\`
  
\`\`\`json
${JSON.stringify(parsedCall.arguments, null, 2)}
\`\`\``;
}

/**
 * Creates a markdown-formatted representation of a tool result for display
 * @param parsedCall The parsed tool call
 * @param result The result from executing the tool
 * @param isError Whether the result is an error
 * @returns Markdown string representing the tool result
 */
export function formatToolResultMarkdown(
  parsedCall: ParsedToolCall, 
  result: any, 
  isError = false
): string {
  const header = isError 
    ? `**Tool Error:** \`${parsedCall.serverName}.${parsedCall.methodName}\``
    : `**Tool Result:** \`${parsedCall.serverName}.${parsedCall.methodName}\``;
  
  return `${header}
  
\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\``;
}
