/**
 * Tool calling types aligned with Model Context Protocol standard
 */

// Import MCP-specific tool types for compatibility
import type { ToolArguments } from '../types/mcp/tools';

/**
 * Represents a tool call request from an LLM
 * Compatible with MCP's ToolArguments interface
 */
export interface ToolCall extends ToolArguments {}

/**
 * Represents an array of tool calls
 */
export interface ToolCalls {
  tool_calls: ToolCall[];
}

/**
 * Represents the result of a tool call execution
 * Compatible with MCP's ToolInvocationResponse
 */
export interface ToolResult {
  name: string;
  content?: any;
  error?: string;
}

/**
 * Represents an array of tool results
 */
export interface ToolResults {
  tool_results: ToolResult[];
}

/**
 * Internal representation of a parsed tool call with server and method separated
 * Related to MCPToolWithServer but with a different structure
 */
export interface ParsedToolCall {
  serverName: string;
  methodName: string;
  arguments: Record<string, any>;
  fullName: string; // The original combined "server.method" format
}

/**
 * Represents a tool call or result for frontend display
 */
export interface ToolCallDisplay {
  callType: 'request' | 'response' | 'error';
  serverName: string;
  methodName: string;
  data: any;
  timestamp: number;
  id: string; // Unique identifier for the tool call
}

/**
 * Error types specific to tool parsing
 */
export enum ToolParsingErrorType {
  MALFORMED_JSON = 'malformed_json',
  INVALID_TOOL_CALL = 'invalid_tool_call',
  INVALID_TOOL_NAME = 'invalid_tool_name',
  MISSING_ARGUMENTS = 'missing_arguments',
}

/**
 * Represents an error that occurred during tool parsing
 */
export class ToolParsingError extends Error {
  type: ToolParsingErrorType;
  data?: any;

  constructor(message: string, type: ToolParsingErrorType, data?: any) {
    super(message);
    this.name = 'ToolParsingError';
    this.type = type;
    this.data = data;
  }
}
