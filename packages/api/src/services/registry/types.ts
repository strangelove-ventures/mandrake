/**
 * Service Registry Types
 * 
 * This file defines the core interfaces for the service registry architecture.
 */
import type { Logger } from '@mandrake/utils';
import type { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import type { MCPManager } from '@mandrake/mcp';
import type { SessionCoordinator } from '@mandrake/session';

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
 * Options for creating a service through an adapter
 */
export interface ServiceCreationOptions {
  /** The service instance to adapt */
  instance: any;
  
  /** Optional service-specific options */
  options?: Record<string, any>;
  
  /** Optional logger to use */
  logger?: Logger;
  
  /** Optional workspace ID for workspace services */
  workspaceId?: string;
  
  /** Optional metadata for the service */
  metadata?: Record<string, any>;
}

/**
 * Service registry interface for managing service lifecycles
 */
export interface ServiceRegistry {
  /**
   * Register a global service directly
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
   * Register a workspace-specific service directly
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
   * Register a service factory for lazy creation
   * @param type The service type
   * @param factory Function that creates the service instance
   * @param options Optional registration options
   */
  registerServiceFactory<T extends ManagedService>(
    type: string,
    factory: () => T,
    options?: ServiceOptions
  ): void;
  
  /**
   * Register a workspace service factory for lazy creation
   * @param workspaceId The workspace ID
   * @param type The service type
   * @param factory Function that creates the service instance
   * @param options Optional registration options
   */
  registerWorkspaceServiceFactory<T extends ManagedService>(
    workspaceId: string,
    type: string,
    factory: () => T,
    options?: ServiceOptions
  ): void;
  
  /**
   * Register a workspace factory function that will apply to any workspace ID
   * @param type The service type
   * @param factoryFn Function that takes a workspace ID and returns a service instance
   * @param options Optional registration options
   */
  registerWorkspaceFactoryFunction<T extends ManagedService>(
    type: string,
    factoryFn: (workspaceId: string) => T,
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
   * @returns The MandrakeManager instance
   * @throws Error if the service is not available
   */
  getMandrakeManager(): Promise<MandrakeManager>;
  
  /**
   * Get an MCPManager instance
   * @param workspaceId Optional workspace ID for workspace-specific MCP manager
   * @returns The MCPManager instance
   * @throws Error if the service is not available
   */
  getMCPManager(workspaceId?: string): Promise<MCPManager>;
  
  /**
   * Get a WorkspaceManager instance
   * @param workspaceId The ID of the workspace
   * @returns The WorkspaceManager instance
   * @throws Error if the service is not available
   */
  getWorkspaceManager(workspaceId: string): Promise<WorkspaceManager>;
  
  /**
   * Get a SessionCoordinator instance
   * @param workspaceId Optional workspace ID for workspace-specific session coordinator
   * @returns The SessionCoordinator instance
   * @throws Error if the service is not available
   */
  getSessionCoordinator(workspaceId?: string): Promise<SessionCoordinator>;
  
  /**
   * Register standard services based on common patterns
   * @param home The Mandrake home directory
   * @param logger Optional logger
   */
  registerStandardServices(home: string, logger?: Logger): void;
  
  /**
   * Register services for a specific workspace
   * @param workspaceId The workspace ID
   */
  registerWorkspaceServices(workspaceId: string): void;
  
  /**
   * Ensure that required services are available
   * @param requiredServices Services that must be available
   * @param workspaceId Optional workspace ID for workspace services
   * @throws Error if any required service is not available
   */
  ensureServices(
    requiredServices: string[], 
    workspaceId?: string
  ): Promise<void>;
  
  /**
   * Create and register a service in a single function call
   * @param type The service type
   * @param adapterClass The adapter class to instantiate
   * @param creationOptions Options for creating the service
   * @param registrationOptions Optional registration options
   * @returns The created service instance
   */
  createAndRegisterService<T extends ManagedService>(
    type: string,
    adapterClass: new (instance: any, options?: any) => T,
    creationOptions: ServiceCreationOptions,
    registrationOptions?: ServiceOptions
  ): T;
  
  /**
   * Create and register a workspace service in a single function call
   * @param workspaceId The workspace ID
   * @param type The service type
   * @param adapterClass The adapter class to instantiate
   * @param creationOptions Options for creating the service
   * @param registrationOptions Optional registration options
   * @returns The created service instance
   */
  createAndRegisterWorkspaceService<T extends ManagedService>(
    workspaceId: string,
    type: string,
    adapterClass: new (instance: any, options?: any) => T,
    creationOptions: Omit<ServiceCreationOptions, 'workspaceId'>,
    registrationOptions?: ServiceOptions
  ): T;
}