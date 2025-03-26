import type { ManagedService, ServiceOptions, ServiceRegistry, ServiceStatus } from './types';
import { ConsoleLogger, type Logger, type LogMeta } from '@mandrake/utils';

/**
 * Default logger implementation for ServiceRegistry
 */
function createDefaultLogger(): Logger {
  return new ConsoleLogger({
    meta: { component: 'ServiceRegistry' }
  });
}

/**
 * Implementation of the ServiceRegistry interface with enhanced capabilities
 */
export class ServiceRegistryImpl implements EnhancedServiceRegistry {
  // Factory maps for lazy service creation
  private serviceFactories = new Map<string, () => ManagedService>();
  private workspaceServiceFactories = new Map<string, Map<string, () => ManagedService>>();
  private workspaceFactoryFunctions = new Map<string, (workspaceId: string) => ManagedService>();
  private factoryOptions = new Map<string, ServiceOptions>();
  private services = new Map<string, ManagedService>();
  private workspaceServices = new Map<string, Map<string, ManagedService>>();
  private dependencyGraph = new Map<string, string[]>();
  private serviceOptions = new Map<string, ServiceOptions>();
  private initialized = false;
  private logger: Logger;

  /**
   * Create a new service registry
   * @param options Configuration options
   */
  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger || createDefaultLogger();
  }

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
  ): void {
    if (this.services.has(type)) {
      this.logger.warn('Service already registered, overwriting', { 
        serviceType: type 
      });
    }

    this.services.set(type, instance);
    
    if (options) {
      this.serviceOptions.set(type, options);
      
      // Store dependencies for initialization order
      if (options.dependencies?.length) {
        this.dependencyGraph.set(type, options.dependencies);
      }
    }

    this.logger.debug('Registered service', { serviceType: type });
  }

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
  ): void {
    let workspaceServiceMap = this.workspaceServices.get(workspaceId);
    
    if (!workspaceServiceMap) {
      workspaceServiceMap = new Map<string, ManagedService>();
      this.workspaceServices.set(workspaceId, workspaceServiceMap);
    }

    if (workspaceServiceMap.has(type)) {
      this.logger.warn('Workspace service already registered, overwriting', { 
        workspaceId, 
        serviceType: type 
      });
    }

    workspaceServiceMap.set(type, instance);
    
    // Store options with a workspace-specific key
    if (options) {
      this.serviceOptions.set(`${workspaceId}:${type}`, options);
      
      // Store dependencies for initialization order
      if (options.dependencies?.length) {
        this.dependencyGraph.set(`${workspaceId}:${type}`, options.dependencies);
      }
    }

    this.logger.debug('Registered workspace service', { 
      workspaceId, 
      serviceType: type 
    });
  }

  /**
   * Get a global service
   * @param type The service type to retrieve
   * @returns The service instance or null if not found
   */
  getService<T extends ManagedService>(type: string): T | null {
    // Check if the service is already registered
    const service = this.services.get(type) as T | undefined;
    if (service) {
      return service;
    }
    
    // Check if we have a factory for this service type
    const factory = this.serviceFactories.get(type);
    if (!factory) {
      return null;
    }
    
    // Create the service using the factory
    try {
      this.logger.debug(`Creating service ${type} using factory`);
      const newService = factory() as T;
      
      // Register the service with any previously set options
      const options = this.factoryOptions.get(type);
      this.registerService(type, newService, options);
      
      // Initialize if the registry is already initialized
      if (this.initialized) {
        // Non-blocking initialization
        newService.init().catch(error => {
          this.logger.error(`Failed to initialize service ${type}`, { 
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }
      
      return newService;
    } catch (error) {
      this.logger.error(`Failed to create service ${type}`, { 
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get a workspace-specific service
   * @param workspaceId The ID of the workspace
   * @param type The service type to retrieve
   * @returns The service instance or null if not found
   */
  getWorkspaceService<T extends ManagedService>(workspaceId: string, type: string): T | null {
    // Check if the service is already registered
    const workspaceServiceMap = this.workspaceServices.get(workspaceId);
    if (workspaceServiceMap) {
      const service = workspaceServiceMap.get(type) as T | undefined;
      if (service) {
        return service;
      }
    }
    
    // Check if we have a specific factory for this workspace and service type
    let factory: (() => ManagedService) | undefined;
    const workspaceFactories = this.workspaceServiceFactories.get(workspaceId);
    if (workspaceFactories) {
      factory = workspaceFactories.get(type);
    }
    
    // If no specific factory is found, check if we have a generic factory function
    if (!factory) {
      const factoryFn = this.workspaceFactoryFunctions.get(type);
      if (factoryFn) {
        // Create a factory function that uses the workspace ID
        factory = () => factoryFn(workspaceId);
      }
    }
    
    // If we found either a specific or generic factory, use it
    if (factory) {
      try {
        this.logger.debug(`Creating workspace service ${workspaceId}:${type} using factory`);
        const newService = factory() as T;
        
        // Register the service with any previously set options
        const options = this.factoryOptions.get(`${workspaceId}:${type}`);
        this.registerWorkspaceService(workspaceId, type, newService, options);
        
        // Initialize if the registry is already initialized
        if (this.initialized) {
          // Non-blocking initialization
          newService.init().catch(error => {
            this.logger.error(`Failed to initialize workspace service ${workspaceId}:${type}`, { 
              error: error instanceof Error ? error.message : String(error)
            });
          });
        }
        
        return newService;
      } catch (error) {
        this.logger.error(`Failed to create workspace service ${workspaceId}:${type}`, { 
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      }
    }
    
    // No factory available
    return null;
  }
  
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
  ): void {
    if (this.workspaceFactoryFunctions.has(type)) {
      this.logger.warn('Workspace factory function already registered, overwriting', { 
        serviceType: type 
      });
    }
    
    this.workspaceFactoryFunctions.set(type, factoryFn);
    
    if (options) {
      // Store options with a generic key since it applies to any workspace
      this.factoryOptions.set(`*:${type}`, options);
    }
    
    this.logger.debug('Registered workspace factory function', { serviceType: type });
  }
  
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
  ): void {
    if (this.serviceFactories.has(type)) {
      this.logger.warn('Service factory already registered, overwriting', { 
        serviceType: type 
      });
    }
    
    this.serviceFactories.set(type, factory);
    
    if (options) {
      this.factoryOptions.set(type, options);
    }
    
    this.logger.debug('Registered service factory', { serviceType: type });
  }
  
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
  ): void {
    let workspaceFactories = this.workspaceServiceFactories.get(workspaceId);
    
    if (!workspaceFactories) {
      workspaceFactories = new Map<string, () => ManagedService>();
      this.workspaceServiceFactories.set(workspaceId, workspaceFactories);
    }
    
    if (workspaceFactories.has(type)) {
      this.logger.warn('Workspace service factory already registered, overwriting', { 
        workspaceId, 
        serviceType: type 
      });
    }
    
    workspaceFactories.set(type, factory);
    
    if (options) {
      this.factoryOptions.set(`${workspaceId}:${type}`, options);
    }
    
    this.logger.debug('Registered workspace service factory', { 
      workspaceId, 
      serviceType: type 
    });
  }

  /**
   * Initialize all registered services in dependency order
   * Global services are initialized before workspace services
   */
  async initializeServices(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Services already initialized');
      return;
    }

    this.logger.info('Starting service initialization');

    // Get the initialization order based on dependencies
    const initOrder = this.getInitializationOrder();
    this.logger.debug('Initialization order', { order: initOrder.join(', ') });

    // Initialize global services first
    for (const serviceType of initOrder) {
      // Skip workspace services
      if (serviceType.includes(':')) continue;
      
      const service = this.services.get(serviceType);
      if (!service) continue;

      try {
        this.logger.debug('Initializing service', { serviceType });
        await service.init();
        this.logger.debug('Service initialized', { serviceType });
      } catch (error) {
        this.logger.error('Failed to initialize service', { 
          serviceType, 
          error: error instanceof Error ? error.message : String(error)
        });
        throw new Error(`Service initialization failed for ${serviceType}: ${error}`);
      }
    }

    // Then initialize workspace services in dependency order
    for (const [workspaceId, serviceMap] of this.workspaceServices.entries()) {
      for (const serviceType of initOrder) {
        // Skip global services and other workspace services
        if (!serviceType.startsWith(`${workspaceId}:`)) continue;
        
        // Extract the actual service type from the prefixed string
        const actualServiceType = serviceType.split(':')[1];
        const service = serviceMap.get(actualServiceType);
        if (!service) continue;

        try {
          this.logger.debug('Initializing workspace service', { 
            workspaceId, 
            serviceType: actualServiceType 
          });
          await service.init();
          this.logger.debug('Workspace service initialized', { 
            workspaceId, 
            serviceType: actualServiceType 
          });
        } catch (error) {
          this.logger.error('Failed to initialize workspace service', { 
            workspaceId, 
            serviceType: actualServiceType, 
            error: error instanceof Error ? error.message : String(error)
          });
          throw new Error(`Workspace service initialization failed for ${workspaceId}.${actualServiceType}: ${error}`);
        }
      }
    }

    this.initialized = true;
    this.logger.info('All services initialized successfully');
  }

  /**
   * Clean up all registered services in reverse dependency order
   * Workspace services are cleaned up before global services
   */
  async cleanupServices(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('Services not initialized, nothing to clean up');
      return;
    }

    this.logger.info('Starting service cleanup');

    // Get initialization order and reverse it for cleanup
    const initOrder = this.getInitializationOrder();
    const cleanupOrder = [...initOrder].reverse();
    
    this.logger.debug('Cleanup order', { order: cleanupOrder.join(', ') });

    // Track errors but continue cleanup
    const errors: Error[] = [];

    // Clean up workspace services first in reverse dependency order
    for (const [workspaceId, serviceMap] of this.workspaceServices.entries()) {
      for (const serviceType of cleanupOrder) {
        // Skip global services and other workspace services
        if (!serviceType.startsWith(`${workspaceId}:`)) continue;
        
        // Extract the actual service type from the prefixed string
        const actualServiceType = serviceType.split(':')[1];
        const service = serviceMap.get(actualServiceType);
        if (!service) continue;

        try {
          this.logger.debug('Cleaning up workspace service', { 
            workspaceId, 
            serviceType: actualServiceType 
          });
          await service.cleanup();
          this.logger.debug('Workspace service cleaned up', { 
            workspaceId, 
            serviceType: actualServiceType 
          });
        } catch (error) {
          this.logger.error('Failed to clean up workspace service', { 
            workspaceId, 
            serviceType: actualServiceType, 
            error: error instanceof Error ? error.message : String(error)
          });
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    // Then clean up global services in reverse dependency order
    for (const serviceType of cleanupOrder) {
      // Skip workspace services
      if (serviceType.includes(':')) continue;
      
      const service = this.services.get(serviceType);
      if (!service) continue;

      try {
        this.logger.debug('Cleaning up service', { serviceType });
        await service.cleanup();
        this.logger.debug('Service cleaned up', { serviceType });
      } catch (error) {
        this.logger.error('Failed to clean up service', { 
          serviceType, 
          error: error instanceof Error ? error.message : String(error)
        });
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.initialized = false;
    
    if (errors.length > 0) {
      this.logger.error('Some services failed to clean up', { 
        errorCount: errors.length 
      });
      throw new AggregateError(errors, 'Some services failed to clean up properly');
    }
    
    this.logger.info('All services cleaned up successfully');
  }

  /**
   * Get the status of a service
   * @param type The service type
   * @param workspaceId Optional workspace ID for workspace services
   * @returns Status information for the service
   */
  async getServiceStatus(type: string, workspaceId?: string): Promise<ServiceStatus | null> {
    if (workspaceId) {
      const service = this.getWorkspaceService(workspaceId, type);
      return service ? await service.getStatus() : null;
    } else {
      const service = this.getService(type);
      return service ? await service.getStatus() : null;
    }
  }
  
  /**
   * Register standard services based on common patterns
   * @param home The Mandrake home directory
   * @param logger Optional logger
   */
  registerStandardServices(home: string, logger?: Logger): void {
    // Use the exported helper function to register standard service factories
    registerStandardServiceFactories(this, home, logger);
  }

  /**
   * Get the status of all registered services
   * @returns Map of service type to status
   */
  async getAllServiceStatuses(): Promise<Map<string, ServiceStatus>> {
    const statuses = new Map<string, ServiceStatus>();
    
    // Get global service statuses
    for (const [type, service] of this.services.entries()) {
      statuses.set(type, await service.getStatus());
    }
    
    // Get workspace service statuses
    for (const [workspaceId, serviceMap] of this.workspaceServices.entries()) {
      for (const [type, service] of serviceMap.entries()) {
        statuses.set(`${workspaceId}:${type}`, await service.getStatus());
      }
    }
    
    return statuses;
  }

  /**
   * Calculate the initialization order based on dependencies
   * @returns Array of service types in dependency order
   * @private
   */
  private getInitializationOrder(): string[] {
    // Create a copy of the dependency graph to work with
    const graph = new Map(this.dependencyGraph);
    
    // Add all services to the graph, even if they have no dependencies
    for (const [type] of this.services) {
      if (!graph.has(type)) {
        graph.set(type, []);
      }
    }
    
    // Add all workspace services to the graph
    for (const [workspaceId, serviceMap] of this.workspaceServices.entries()) {
      for (const [type] of serviceMap) {
        const fullType = `${workspaceId}:${type}`;
        if (!graph.has(fullType)) {
          graph.set(fullType, []);
        }
      }
    }
    
    // Services that have no dependencies or whose dependencies have been processed
    const resolved: string[] = [];
    
    // Keep track of nodes that are being processed in the current DFS stack
    const processing = new Set<string>();
    
    // Keep track of nodes that have been visited
    const visited = new Set<string>();
    
    // Depth-first search implementation to detect cycles and build order
    const visit = (node: string) => {
      // Skip if already processed
      if (visited.has(node)) return;
      
      // Check for cycles
      if (processing.has(node)) {
        throw new Error(`Dependency cycle detected: ${node} is in a cycle`);
      }
      
      // Mark as processing
      processing.add(node);
      
      // Visit dependencies
      const dependencies = graph.get(node) || [];
      for (const dependency of dependencies) {
        // Skip dependency that doesn't exist to avoid failures
        if (!graph.has(dependency)) {
          this.logger.warn('Service depends on unregistered service', { 
            service: node, 
            dependency
          });
          continue;
        }
        
        // Check for workspace-specific dependencies which should be prefixed
        if (node.includes(':') && !dependency.includes(':')) {
          const workspaceId = node.split(':')[0];
          const workspaceDependency = `${workspaceId}:${dependency}`;
          
          // If the workspace-specific dependency exists, use it instead
          if (graph.has(workspaceDependency)) {
            visit(workspaceDependency);
          } else {
            // Otherwise use the global dependency
            visit(dependency);
          }
        } else {
          // Regular dependency resolution
          visit(dependency);
        }
      }
      
      // Remove from processing set
      processing.delete(node);
      
      // Mark as visited
      visited.add(node);
      
      // Add to resolved list
      resolved.push(node);
    };
    
    // Process all nodes
    for (const [node] of graph) {
      if (!visited.has(node)) {
        visit(node);
      }
    }
    
    // Sort services by priority if specified
    return resolved.sort((a, b) => {
      const aOptions = this.serviceOptions.get(a);
      const bOptions = this.serviceOptions.get(b);
      
      const aPriority = aOptions?.initializationPriority || 0;
      const bPriority = bOptions?.initializationPriority || 0;
      
      // Higher priority is initialized first
      return bPriority - aPriority;
    });
  }
}

/**
 * Helper functions for creating and registering services
 */

/**
 * Options for creating a service
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
 * Options for registering a service
 */
export interface ServiceRegistrationOptions {
  /** Optional dependencies for the service */
  dependencies?: string[];
  
  /** Optional initialization priority (higher is initialized earlier) */
  initializationPriority?: number;
  
  /** Optional metadata for the service */
  metadata?: Record<string, any>;
}

/**
 * Create and register a service in a single function call
 * @param registry The service registry to register with
 * @param type The service type
 * @param adapterClass The adapter class to instantiate
 * @param creationOptions Options for creating the service
 * @param registrationOptions Options for registering the service
 * @returns The created service instance
 */
export function createAndRegisterService<T extends ManagedService>(
  registry: ServiceRegistry,
  type: string,
  adapterClass: new (instance: any, options?: any) => T,
  creationOptions: ServiceCreationOptions,
  registrationOptions?: ServiceRegistrationOptions
): T {
  // Create service instance
  const loggerMeta: LogMeta = { 
    service: `${adapterClass.name}` 
  };
  
  if (creationOptions.workspaceId) {
    loggerMeta.workspaceId = creationOptions.workspaceId;
  }
  
  // Create the adapter with appropriate options
  const adapterOptions: Record<string, any> = {
    ...creationOptions.options,
    logger: creationOptions.logger || new ConsoleLogger({ meta: loggerMeta }),
    ...creationOptions.metadata
  };
  
  // Add workspaceId to options if provided
  if (creationOptions.workspaceId) {
    adapterOptions.workspaceId = creationOptions.workspaceId;
  }
  
  const adapter = new adapterClass(
    creationOptions.instance,
    adapterOptions
  );
  
  // Register the service with the registry
  if (creationOptions.workspaceId) {
    registry.registerWorkspaceService(
      creationOptions.workspaceId,
      type,
      adapter,
      registrationOptions
    );
  } else {
    registry.registerService(
      type,
      adapter,
      registrationOptions
    );
  }
  
  return adapter;
}

/**
 * Create and register a workspace service in a single function call
 * @param registry The service registry to register with
 * @param workspaceId The workspace ID
 * @param type The service type
 * @param adapterClass The adapter class to instantiate
 * @param creationOptions Options for creating the service
 * @param registrationOptions Options for registering the service
 * @returns The created service instance
 */
export function createAndRegisterWorkspaceService<T extends ManagedService>(
  registry: ServiceRegistry,
  workspaceId: string,
  type: string,
  adapterClass: new (instance: any, options?: any) => T,
  creationOptions: Omit<ServiceCreationOptions, 'workspaceId'>,
  registrationOptions?: ServiceRegistrationOptions
): T {
  return createAndRegisterService(
    registry,
    type,
    adapterClass,
    { ...creationOptions, workspaceId },
    registrationOptions
  );
}

/**
 * Enhanced ServiceRegistry interface with lazy service creation capabilities
 * 
 * This extension adds the ability to register service factories and create services on-demand
 */
export interface EnhancedServiceRegistry extends ServiceRegistry {
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
   * Create and register standard services based on common patterns
   * @param home The Mandrake home directory
   * @param logger Optional logger
   */
  registerStandardServices(home: string, logger?: Logger): void;
}

/**
 * Register standard service factories
 * @param registry The registry to register with
 * @param home Mandrake home directory
 * @param logger Optional logger to use
 */
export function registerStandardServiceFactories(
  registry: EnhancedServiceRegistry,
  home: string,
  logger?: Logger
): void {
  // Import required adapters
  const { 
    MandrakeManagerAdapter, 
    MCPManagerAdapter,
    WorkspaceManagerAdapter,
    SessionCoordinatorAdapter 
  } = require('./adapters');
  
  // Import manager classes
  const { MandrakeManager } = require('@mandrake/workspace');
  const { MCPManager } = require('@mandrake/mcp');
  
  // Standard service dependencies
  const serviceDependencies = {
    'mandrake-manager': [],
    'mcp-manager': ['mandrake-manager'],
    'workspace-manager': ['mandrake-manager'],
    'session-coordinator': ['workspace-manager']
  };
  
  // Standard service priorities
  const servicePriorities = {
    'mandrake-manager': 100,
    'workspace-manager': 50,
    'mcp-manager': 25,
    'session-coordinator': 10
  };
  
  // Create logger for service factories
  const serviceLogger = logger || new ConsoleLogger({
    meta: { component: 'ServiceFactories' }
  });
  
  // Register MandrakeManager factory
  registry.registerServiceFactory(
    'mandrake-manager',
    () => {
      const mandrakeManager = new MandrakeManager(home);
      return new MandrakeManagerAdapter(mandrakeManager, {
        logger: new ConsoleLogger({ meta: { service: 'MandrakeManagerAdapter' } })
      });
    },
    {
      dependencies: serviceDependencies['mandrake-manager'],
      initializationPriority: servicePriorities['mandrake-manager']
    }
  );
  
  // Register MCPManager factory
  registry.registerServiceFactory(
    'mcp-manager',
    () => {
      // Get MandrakeManager first
      const mandrakeAdapter = registry.getService<typeof MandrakeManagerAdapter>('mandrake-manager');
      if (!mandrakeAdapter) {
        throw new Error('Cannot create MCPManager: MandrakeManager service not available');
      }
      
      const mcpManager = new MCPManager();
      return new MCPManagerAdapter(
        mcpManager,
        {}, // No initial config
        'default',
        {
          logger: new ConsoleLogger({ meta: { service: 'SystemMCPManagerAdapter' } })
        }
      );
    },
    {
      dependencies: serviceDependencies['mcp-manager'],
      initializationPriority: servicePriorities['mcp-manager']
    }
  );
  
  // Define base workspace service factories (these will be registered per workspace)
  const createWorkspaceManager = (workspaceId: string) => {
    // Get MandrakeManager first
    const mandrakeAdapter = registry.getService<typeof MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeAdapter) {
      throw new Error('Cannot create WorkspaceManager: MandrakeManager service not available');
    }
    
    // Get workspace data
    const workspaceData = mandrakeAdapter.getManager().getWorkspace(workspaceId);
    
    return new WorkspaceManagerAdapter(workspaceData, {
      logger: new ConsoleLogger({ 
        meta: { service: 'WorkspaceManagerAdapter', workspaceId } 
      })
    });
  };
  
  const createWorkspaceMcpManager = (workspaceId: string) => {
    // Get workspace manager first
    const workspaceManager = registry.getWorkspaceService<typeof WorkspaceManagerAdapter>(
      workspaceId,
      'workspace-manager'
    );
    
    if (!workspaceManager) {
      throw new Error(`Cannot create MCPManager: WorkspaceManager for ${workspaceId} not available`);
    }
    
    // Create MCPManager
    const mcpManager = new MCPManager();
    
    // Get tool configs
    let active = 'default';
    let toolConfigs = {};
    
    try {
      const manager = workspaceManager.getManager();
      active = manager.tools.getActive();
      toolConfigs = manager.tools.getConfigSet(active);
    } catch (error) {
      serviceLogger.warn(`Error getting tool configs for workspace ${workspaceId}`, { error });
    }
    
    return new MCPManagerAdapter(
      mcpManager,
      toolConfigs,
      active,
      {
        logger: new ConsoleLogger({ 
          meta: { service: 'MCPManagerAdapter', workspaceId } 
        }),
        workspaceId
      }
    );
  };
  
  const createSessionCoordinator = (workspaceId: string) => {
    // Get workspace manager first
    const workspaceManager = registry.getWorkspaceService<typeof WorkspaceManagerAdapter>(
      workspaceId,
      'workspace-manager'
    );
    
    if (!workspaceManager) {
      throw new Error(`Cannot create SessionCoordinator: WorkspaceManager for ${workspaceId} not available`);
    }
    
    return new SessionCoordinatorAdapter({
      workspaceId,
      logger: new ConsoleLogger({ 
        meta: { service: 'SessionCoordinatorAdapter', workspaceId } 
      })
    });
  };
  
  // Register workspace factory functions that will be used whenever a specific workspace is requested
  // This approach doesn't require having the workspace list ahead of time
  const registerWorkspaceFactoryFunctions = () => {
    // Register dynamic factory registration function
    registry.registerServiceFactory(
      'workspace-factory-registrar',
      () => {
        return {
          async init(): Promise<void> {
            serviceLogger.info('Initializing workspace factory registrar');
            
            // Register this workspace-specific factory for ANY workspace ID that gets requested
            registry.registerWorkspaceFactoryFunction<typeof WorkspaceManagerAdapter>(
              'workspace-manager',
              (wsId: string) => createWorkspaceManager(wsId),
              {
                dependencies: serviceDependencies['workspace-manager'],
                initializationPriority: servicePriorities['workspace-manager']
              }
            );
            
            registry.registerWorkspaceFactoryFunction<typeof MCPManagerAdapter>(
              'mcp-manager',
              (wsId: string) => createWorkspaceMcpManager(wsId),
              {
                dependencies: [], // We'll handle dependencies in the adapter
                initializationPriority: servicePriorities['mcp-manager']
              }
            );
            
            registry.registerWorkspaceFactoryFunction<typeof SessionCoordinatorAdapter>(
              'session-coordinator',
              (wsId: string) => createSessionCoordinator(wsId),
              {
                dependencies: [], // We'll handle dependencies in the adapter
                initializationPriority: servicePriorities['session-coordinator']
              }
            );
            
            serviceLogger.info('Workspace factory functions registered');
          },
          
          async cleanup(): Promise<void> {
            serviceLogger.info('Cleaning up workspace factory registrar');
          },
          
          isInitialized(): boolean {
            return true;
          },
          
          getStatus(): Promise<ServiceStatus> {
            return Promise.resolve({
              isHealthy: true,
              statusCode: 200,
              message: 'Workspace factory registrar is available'
            });
          }
        };
      },
      {
        dependencies: ['mandrake-manager'],
        initializationPriority: 90 // High priority, just below mandrake-manager
      }
    );
  };
  
  // Also try to register existing workspaces if available
  const registerExistingWorkspaces = async () => {
    try {
      const mandrakeAdapter = registry.getService('mandrake-manager') as any;
      if (!mandrakeAdapter) {
        serviceLogger.warn('Cannot register existing workspaces: MandrakeManager not available');
        return;
      }
      
      // Get workspaces list
      let workspaces = [];
      try {
        workspaces = mandrakeAdapter.getManager().listWorkspaces();
        
        // Ensure workspaces is an array (handle potential API differences)
        if (!Array.isArray(workspaces)) {
          serviceLogger.warn('listWorkspaces did not return an array, skipping workspace registration');
          return;
        }
      } catch (error) {
        serviceLogger.warn('Could not list workspaces, skipping workspace registration', { error });
        return;
      }
      
      for (const workspace of workspaces) {
        const workspaceId = workspace.id;
        
        // Pre-register workspace services for existing workspaces
        // When using the dynamic factory functions, these are not strictly needed,
        // but registering them explicitly can improve performance
        serviceLogger.info(`Pre-registering workspace services for ${workspaceId}`);
        
        try {
          // Each service will be created on-demand when requested
          registry.registerWorkspaceServiceFactory(
            workspaceId,
            'workspace-manager',
            () => createWorkspaceManager(workspaceId),
            {
              dependencies: serviceDependencies['workspace-manager'],
              initializationPriority: servicePriorities['workspace-manager']
            }
          );
          
          registry.registerWorkspaceServiceFactory(
            workspaceId,
            'mcp-manager',
            () => createWorkspaceMcpManager(workspaceId),
            {
              dependencies: [`${workspaceId}:workspace-manager`],
              initializationPriority: servicePriorities['mcp-manager']
            }
          );
          
          registry.registerWorkspaceServiceFactory(
            workspaceId,
            'session-coordinator',
            () => createSessionCoordinator(workspaceId),
            {
              dependencies: [`${workspaceId}:workspace-manager`],
              initializationPriority: servicePriorities['session-coordinator']
            }
          );
        } catch (error) {
          serviceLogger.error(`Error registering services for workspace ${workspaceId}`, { error });
        }
      }
    } catch (error) {
      serviceLogger.error('Error registering workspace factories', { error });
    }
  };
  
  // Register the workspace factory functions first - these will handle any workspace ID
  registerWorkspaceFactoryFunctions();
  
  // Also try to register known workspaces if the MandrakeManager is available
  const mandrakeAdapter = registry.getService<typeof MandrakeManagerAdapter>('mandrake-manager');
  if (mandrakeAdapter) {
    // Try to initialize the MandrakeManager and register existing workspaces
    mandrakeAdapter.init()
      .then(() => registerExistingWorkspaces())
      .catch((error: any) => {
        serviceLogger.error('Failed to initialize MandrakeManager for workspace factories', { error });
      });
  }
}

export * from './types';