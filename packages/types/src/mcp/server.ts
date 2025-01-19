/**
 * Core MCP Server interface representing a single MCP server instance
 */
import { Tool, ToolResult } from './tools';

export interface MCPServer {
  /** Get server ID */
  getId(): string;

  /** Get server name */
  getName(): string;

  /** Start the server */
  start(): Promise<void>;
  
  /** Stop the server */
  stop(): Promise<void>;

  /** List available tools */
  listTools(): Promise<Tool[]>;
  
  /** Invoke a tool with given parameters */
  invokeTool(name: string, params: any): Promise<ToolResult>;
  
  /** Get current server state/info */
  getInfo(): Promise<any>; // Implementation-specific info type
}