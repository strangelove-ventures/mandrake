/**
 * Tools API types
 * 
 * Types for tool-related API operations
 */

import type { ServerConfig, ToolsConfig } from '../workspace';

/**
 * Tool configuration set response
 */
export interface ToolConfigSetResponse {
  /** Config set ID */
  id: string;
  /** Config set name */
  name: string;
  /** Tool configurations */
  configs: Record<string, ServerConfig | null>;
}

/**
 * List of tool configuration sets response
 */
export type ToolConfigSetListResponse = {
  /** List of config sets */
  sets: ToolConfigSetResponse[];
  /** Currently active config set */
  active: string;
};

/**
 * Parameters for creating a tool config set
 */
export interface CreateToolConfigSetRequest {
  /** Config set name */
  name: string;
  /** Initial tool configurations */
  configs?: Record<string, ServerConfig | null>;
}

/**
 * Parameters for updating a tool config set
 */
export interface UpdateToolConfigSetRequest {
  /** New config set name */
  name?: string;
}

/**
 * Tool server configuration response
 */
export interface ToolServerConfigResponse extends ServerConfig {
  /** Server name */
  name: string;
}

/**
 * Parameters for creating/updating a tool server configuration
 */
export interface ToolServerConfigRequest extends ServerConfig {}

/**
 * Active tool config set response
 */
export interface ActiveToolConfigSetResponse {
  /** Active config set ID */
  id: string;
}

/**
 * Parameters for setting the active tool config set
 */
export interface SetActiveToolConfigSetRequest {
  /** Config set ID to activate */
  id: string;
}

/**
 * Tool status response
 */
export interface ToolStatusResponse {
  /** Tool name */
  name: string;
  /** Running status */
  running: boolean;
  /** Error message if any */
  error?: string;
}

/**
 * List of tool statuses response
 */
export type ToolStatusListResponse = ToolStatusResponse[];

/**
 * Parameters for starting/stopping a tool
 */
export interface ToolControlRequest {
  /** Whether to start or stop the tool */
  start: boolean;
}