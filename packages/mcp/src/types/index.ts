/**
 * MCP (Model Context Protocol) type definitions
 * 
 * This file contains all type definitions for the MCP package.
 * Defines interfaces for server configuration, state tracking,
 * and tool management.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

/**
 * Server configuration for MCP servers
 */
export interface ServerConfig {
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
  getCompletions(methodName: string, argName: string, value: string): Promise<string[]>;
  getState(): ServerState & { status: string };
  getConfig(): ServerConfig;
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

/**
 * Represents an active connection to an MCP server
 */
export interface MCPConnection {
  server: {
    name: string;
    status: 'connected' | 'disconnected' | 'connecting';
    error?: string;
    tools?: Tool[];
    disabled?: boolean;
  };
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
}

/**
 * Transport types supported by MCP
 */
export enum TransportType {
  STDIO = 'stdio',
  SSE = 'sse'
}

/**
 * Base transport options
 */
export interface TransportOptions {
  type: TransportType;
}