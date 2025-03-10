/**
 * Types for tool configuration components
 */
import { ServerConfig, ToolConfig, ToolsConfig } from '@mandrake/utils';

/**
 * Server edit state type
 */
export interface ServerEditState {
  configId: string;
  serverId: string;
  config: ServerConfig;
}

/**
 * Common props for tools components
 */
export interface ToolsComponentProps {
  isWorkspace?: boolean;
  workspaceId?: string;
}

// Re-export the types from utils for easier access
export type { ServerConfig, ToolConfig, ToolsConfig };