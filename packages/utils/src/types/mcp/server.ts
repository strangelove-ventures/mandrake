/**
 * MCP Server Types
 * 
 * Types related to MCP server configuration, state management, and interfaces.
 */

// External imports for types only (no implementation dependencies)
// We need to reference the client types from MCP SDK
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Server configuration for MCP servers
 */
export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  autoApprove?: string[];
  disabled?: boolean;
}

/**
 * Server state tracking for MCP servers
 */
export interface ServerState {
  error?: string;
  lastRetryTimestamp?: number;
  retryCount: number;
  logs: string[];
}

/**
 * Interface defining the contract for an MCP server implementation
 */
export interface MCPServer {
  getId(): string;
  start(): Promise<void>;
  stop(): Promise<void>;
  listTools(): Promise<Tool[]>;
  invokeTool(name: string, params: any): Promise<any>;
}

// Moved to tools.ts as MCPToolWithServer