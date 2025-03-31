/**
 * Service Registry Types
 * 
 * This file defines the core interfaces for the service registry architecture.
 */

/**
 * ServerState interface to define server states
 */
export interface ServerState {
  /** Health information about the server */
  health?: Record<string, any>;
  
  /** Recent log entries */
  logs?: string[];
  
  /** Status of the server (running, stopped, error, etc.) */
  status: string;
  
  /** Process ID of the server */
  pid?: number;
  
  /** Unix timestamp when the server was started */
  startTime?: number;
  
  /** Number of times the server has been restarted after failures */
  retryCount?: number;
  
  /** Error message if the server failed */
  error?: string;
}

/**
 * Status information for a service
 */
export interface ServiceStatus {
  /** Whether the service is healthy and operating normally */
  isHealthy: boolean;
  
  /** Optional status code for more detailed health information */
  statusCode?: number;
  
  /** Optional message providing additional health information */
  message?: string;
  
  /** Optional details specific to the service type */
  details?: Record<string, any>;
  
  /** Optional error information */
  error?: string;
}

/**
 * Options for service registration
 */
export interface ServiceOptions {
  /** Services that must be initialized before this service */
  dependencies?: string[];
  
  /** Optional priority for initialization (higher is initialized earlier) */
  initializationPriority?: number;
  
  /** Optional metadata for the service */
  metadata?: Record<string, any>;
}

/**
 * Core interface that all managed services must implement
 */
export interface ManagedService {
  /**
   * Initialize the service
   * This should create any necessary resources and prepare the service for use
   */
  init(): Promise<void>;
  
  /**
   * Check if the service is initialized
   * @returns Whether the service has been successfully initialized
   */
  isInitialized(): boolean;
  
  /**
   * Clean up the service
   * This should release all resources and prepare the service for shutdown
   */
  cleanup(): Promise<void>;
  
  /**
   * Get the current status of the service
   * @returns Status information for the service
   */
  getStatus(): Promise<ServiceStatus>;
}

/**
 * Service registry interface for managing service lifecycles
 */
export interface ServiceRegistry {
  /**
   * Register a global service
   * @param type Unique identifier for the service type
   * @param instance The service instance to register
   * @param options Optional registration options
   */
  registerService<T extends ManagedService>(
    type: string, 
    instance: T, 
    options?: ServiceOptions
  ): void;
  
  /**
   * Register a workspace-specific service
   * @param workspaceId The ID of the workspace
   * @param type Unique identifier for the service type
   * @param instance The service instance to register
   * @param options Optional registration options
   */
  registerWorkspaceService<T extends ManagedService>(
    workspaceId: string, 
    type: string, 
    instance: T, 
    options?: ServiceOptions
  ): void;
  
  /**
   * Get a global service
   * @param type The service type to retrieve
   * @returns The service instance or null if not found
   */
  getService<T extends ManagedService>(type: string): T | null;
  
  /**
   * Get a workspace-specific service
   * @param workspaceId The ID of the workspace
   * @param type The service type to retrieve
   * @returns The service instance or null if not found
   */
  getWorkspaceService<T extends ManagedService>(
    workspaceId: string, 
    type: string
  ): T | null;
  
  /**
   * Initialize all registered services in dependency order
   * Global services are initialized before workspace services
   */
  initializeServices(): Promise<void>;
  
  /**
   * Clean up all registered services in reverse dependency order
   * Workspace services are cleaned up before global services
   */
  cleanupServices(): Promise<void>;
  
  /**
   * Get the status of a service
   * @param type The service type
   * @param workspaceId Optional workspace ID for workspace services
   * @returns Status information for the service
   */
  getServiceStatus(type: string, workspaceId?: string): Promise<ServiceStatus | null>;
  
  /**
   * Get the status of all registered services
   * @returns Map of service type to status
   */
  getAllServiceStatuses(): Promise<Map<string, ServiceStatus>>;
  
  /**
   * Get the MandrakeManager instance
   * This is a convenience method that gets the mandrake-manager adapter and returns the underlying manager
   * @returns The MandrakeManager instance or null if not found
   */
  getMandrakeManager(): Promise<any>;
  
  /**
   * Get an MCPManager instance
   * This is a convenience method that gets the mcp-manager adapter and returns the underlying manager
   * @param workspaceId Optional workspace ID. If provided, gets the workspace-specific MCP manager.
   *                   If not provided, gets the system-level MCP manager.
   * @returns The MCPManager instance or null if not found
   */
  getMCPManager(workspaceId?: string): Promise<any>;
  
  /**
   * Get a WorkspaceManager instance
   * This is a convenience method that gets the workspace-manager adapter and returns the underlying manager
   * @param workspaceId The ID of the workspace
   * @returns The WorkspaceManager instance or null if not found
   */
  getWorkspaceManager(workspaceId: string): Promise<any>;
}