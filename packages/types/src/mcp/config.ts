/**
 * Configuration types for MCP servers
 */

/**
 * Volume mount configuration
 */
export interface VolumeConfig {
  /** Source path on host */
  source: string;
  /** Target path in container */
  target: string;
  /** Mount mode (default: "rw") */
  mode?: string;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Interval between health checks in ms */
  interval: number;
  /** Maximum number of retries before failing */
  maxRetries: number;
}

/**
 * Configuration for an MCP server instance
 */
export interface ServerConfig {
  /** Unique identifier */
  id: string;
  
  /** Friendly name */
  name: string;
  
  /** Container image */
  image: string;
  
  /** Optional entrypoint override */
  entrypoint?: string[];
  
  /** Command arguments */
  command: string[];
  
  /** Command to execute for MCP protocol */
  execCommand: string[];
  
  /** Environment variables */
  env?: Record<string, string>;
  
  /** Volume mounts */
  volumes?: VolumeConfig[];
  
  /** Whether to run in privileged mode */
  privileged?: boolean;
  
  /** Additional host configurations */
  hostConfig?: Record<string, any>;
  
  /** Container labels */
  labels?: Record<string, string>;
  
  /** Whether to attempt auto-restart on failure */
  autoRestart?: boolean;
  
  /** Health check configuration */
  healthCheck?: HealthCheckConfig;
}