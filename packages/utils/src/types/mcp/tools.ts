/**
 * MCP Tool Types
 * 
 * Types related to tool definitions and execution in the Model Context Protocol.
 */

// External imports for types only (no implementation dependencies)
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extends the base Tool interface with server name information
 */
export interface MCPToolWithServer extends Tool {
  serverName: string;
}

/**
 * Extends the base Tool interface with server identifier information
 * Used primarily in the return type of listAllTools()
 */
export interface ToolWithServerIdentifier extends Tool {
  server: string;
}

/**
 * Tool invocation response
 */
export interface ToolInvocationResponse {
  isError: boolean;
  content: any;
}

/**
 * MCP Tool arguments
 */
export interface ToolArguments {
  name: string;
  arguments: Record<string, any>;
}