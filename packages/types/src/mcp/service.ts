import { ServerConfig } from './config';
import { MCPServer } from './server';

/**
 * Core MCP service interface for managing multiple server instances
 */
export interface MCPService {
  /** Initialize the service with server configurations */
  initialize(configs: ServerConfig[]): Promise<void>;

  /** Get a specific server by ID */
  getServer(id: string): MCPServer | undefined;

  /** Get all managed servers */
  getServers(): Map<string, MCPServer>;

  /** Clean up all managed servers */
  cleanup(): Promise<void>;
}