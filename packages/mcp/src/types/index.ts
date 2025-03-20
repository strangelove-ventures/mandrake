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
 * Health check strategy types
 */
export enum HealthCheckStrategy {
  TOOL_LISTING = 'tool_listing',  // Use tool listing to check server health
  PING = 'ping',                  // Use a lightweight ping method (if available)
  SPECIFIC_TOOL = 'specific_tool', // Use a specific tool invocation
  CUSTOM = 'custom'                // Use a custom health check function
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  strategy: HealthCheckStrategy;
  intervalMs?: number;            // How often to run checks (default: 30000)
  timeoutMs?: number;             // Timeout for health check operations (default: 5000)
  retries?: number;               // Number of retries before marking unhealthy (default: 1)
  specificTool?: {                // Configuration for SPECIFIC_TOOL strategy
    name: string;                 // Tool name to invoke
    args: Record<string, any>;    // Arguments to pass to the tool
  };
  customCheck?: (server: any) => Promise<boolean>; // Custom health check function
}

/**
 * Health metrics for a server
 */
export interface HealthMetrics {
  isHealthy: boolean;             // Overall health status
  lastCheckTime: number;          // Timestamp of last check
  responseTimeMs?: number;        // Last response time in milliseconds
  checkCount: number;             // Total number of checks performed
  failureCount: number;           // Total number of failed checks
  consecutiveFailures: number;    // Current streak of failures
  lastError?: string;             // Last error message if failed
  checkHistory: Array<{           // History of recent checks
    timestamp: number;
    success: boolean;
    responseTimeMs?: number;
    error?: string;
  }>;
}

/**
 * Server configuration for MCP servers
 */
export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  autoApprove?: string[];
  disabled?: boolean;
  healthCheck?: HealthCheckConfig; // Health check configuration
}

/**
 * Server state tracking for MCP servers
 */
export interface ServerState {
  error?: string;
  lastRetryTimestamp?: number;
  retryCount: number;
  logs: string[];
  health?: HealthMetrics;  // Health metrics tracked by the server
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
  checkHealth(): Promise<boolean>;
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