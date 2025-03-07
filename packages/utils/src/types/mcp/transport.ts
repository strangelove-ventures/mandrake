/**
 * MCP Transport Types
 * 
 * Types related to the communication protocol between MCP client and server.
 */

// External imports for types only (no implementation dependencies)
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

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