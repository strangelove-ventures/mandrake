import Docker from 'dockerode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { DockerTransport } from './transport';

/**
 * Configuration for an MCP server container
 */
export interface ServerConfig {
  /** Friendly name for the server */
  name: string;
  /** Docker image to use */
  image: string;
  /** Optional entrypoint override */
  entrypoint?: string[];
  /** Command arguments */
  command: string[];
  execCommand: string[];  // Let consumer specify the exact exec command

  /** Environment variables */
  env?: Record<string, string>;
  /** Volume mounts */
  volumes?: {
    source: string;
    target: string;
    mode?: string;
  }[];
  /** Whether to run container in privileged mode */
  privileged?: boolean;
  /** Additional Docker host configurations */
  hostConfig?: Docker.ContainerCreateOptions['HostConfig'];
  /** Container labels */
  labels?: Record<string, string>;
  /** Whether to attempt auto-restart on failure */
  autoRestart?: boolean;
  /** Health check configuration */
  healthCheck?: {
    /** Interval between health checks in ms */
    interval: number;
    /** Maximum number of retries before giving up */
    maxRetries: number;
  };
}

/**
 * Current state of an MCP server
 */
export interface ServerState {
  /** Container ID */
  id: string;
  /** Current status */
  status: 'creating' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  /** Error if status is 'error' */
  error?: Error;
  /** Health status */
  health: {
    healthy: boolean;
    lastCheck: Date;
    lastError?: Error;
  };
  /** Docker container reference */
  container: Docker.Container;
  /** MCP client if connected */
  client?: Client;
  /** Transport if connected */
  transport?: DockerTransport;
}

/**
 * Events emitted by an MCP server
 */
export interface ServerEvents {
  /** Emitted when server state changes */
  stateChange: (state: ServerState) => void;
  /** Emitted on server error */
  error: (error: Error) => void;
  /** Emitted when health status changes */
  healthChange: (health: ServerState['health']) => void;
}