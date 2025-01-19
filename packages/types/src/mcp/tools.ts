import { CallToolResult, CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Re-export core types
export { Tool } from '@modelcontextprotocol/sdk/types.js';

// Extend for our needs
export interface ToolCall extends CallToolRequest {
  serverId?: string;  // Add our server tracking
}

export interface ToolResult extends CallToolResult {
  serverId?: string;  // Add our server tracking
}
