/**
 * Converter utilities for working with different tool formats
 * 
 * This module provides utilities for converting between JSON Schema 
 * tool formats and Model Context Protocol (MCP) formats.
 */

import type { ToolArguments, ToolInvocationResponse, MCPToolWithServer } from '../types/mcp/tools';
import type { ToolCall, ToolResult, ParsedToolCall } from './types';
import { parseToolName } from './parser';

/**
 * Converts a ToolCall to an MCP ToolArguments object
 * @param toolCall The tool call to convert
 * @returns The equivalent ToolArguments object (same shape, just for typing)
 */
export function toolCallToMCPArguments(toolCall: ToolCall): ToolArguments {
  // Since ToolCall extends ToolArguments, this is just a type cast
  return toolCall;
}

/**
 * Creates a ToolResult from an MCP ToolInvocationResponse
 * @param name The full tool name (server.method)
 * @param response The MCP tool invocation response
 * @returns A ToolResult object
 */
export function createToolResultFromMCP(
  name: string, 
  response: ToolInvocationResponse
): ToolResult {
  return {
    name,
    ...(response.isError 
      ? { error: String(response.content) } 
      : { content: response.content })
  };
}

/**
 * Converts a ToolResult to an MCP ToolInvocationResponse
 * @param result The tool result to convert
 * @returns The equivalent ToolInvocationResponse
 */
export function toolResultToMCPResponse(result: ToolResult): ToolInvocationResponse {
  return {
    isError: !!result.error,
    content: result.error || result.content
  };
}

/**
 * Converts a ParsedToolCall to an MCP Tool (partial definition)
 * @param parsedCall The parsed tool call
 * @param description Optional description for the tool
 * @param parameters Optional JSON Schema for the tool parameters
 * @returns A partial MCPToolWithServer that needs additional schema info
 */
export function parsedToolCallToMCPTool(
  parsedCall: ParsedToolCall,
  description = '',
  parameters = {}
): Partial<MCPToolWithServer> {
  return {
    serverName: parsedCall.serverName,
    name: parsedCall.methodName,
    description,
    parameters,
  };
}

/**
 * Converts an MCPToolWithServer to a ParsedToolCall
 * @param mcpTool The MCP tool to convert
 * @param args The arguments to use in the ParsedToolCall
 * @returns A ParsedToolCall object
 */
export function mcpToolToParsedToolCall(
  mcpTool: MCPToolWithServer,
  args: Record<string, any> = {}
): ParsedToolCall {
  return {
    serverName: mcpTool.serverName,
    methodName: mcpTool.name,
    arguments: args,
    fullName: `${mcpTool.serverName}.${mcpTool.name}`
  };
}

/**
 * Create a ParsedToolCall from a ToolCall
 * @param toolCall The tool call to parse
 * @returns A ParsedToolCall object with server and method names
 * @throws Error if the tool name format is invalid
 */
export function createParsedToolCall(toolCall: ToolCall): ParsedToolCall {
  const parsed = parseToolName(toolCall.name);
  if (!parsed) {
    throw new Error(`Invalid tool name format: ${toolCall.name}`);
  }
  
  return {
    serverName: parsed.serverName,
    methodName: parsed.methodName,
    arguments: toolCall.arguments,
    fullName: toolCall.name
  };
}
