import type { 
  ManagedService, 
  ServiceOptions, 
  ServiceRegistry, 
  ServiceStatus,
  ServiceCreationOptions
} from './types';
import { ConsoleLogger, type Logger, type LogMeta } from '@mandrake/utils';
import { 
  MandrakeManagerAdapter, 
  MCPManagerAdapter, 
  WorkspaceManagerAdapter,
  SessionCoordinatorAdapter
} from './adapters';
import type { 
  MandrakeManager,
  WorkspaceManager 
} from '@mandrake/workspace';
import type { MCPManager } from '@mandrake/mcp';
import type { SessionCoordinator } from '@mandrake/session';

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
export class ServiceRegistryImpl implements ServiceRegistry {
  // Registry state
  private services = new Map<string, ManagedService>();
  private workspaceServices = new Map<string, Map<string, ManagedService>>();
  private dependencyGraph = new Map<string, string[]>();
  private serviceOptions = new Map<string, ServiceOptions>();
  private initialized = false;
  private logger: Logger;

  // Factory maps for lazy service creation
  private serviceFactories = new Map<string, () => ManagedService>();
  private workspaceServiceFactories = new Map<string, Map<string, () => ManagedService>>();
  private workspaceFactoryFunctions = new Map<string, (workspaceId: string) => ManagedService>();
  private factoryOptions = new Map<string, ServiceOptions>();

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
      const optionsKey = this.getWorkspaceServiceKey(workspaceId, type);
      this.serviceOptions.set(optionsKey, options);
      
      // Store dependencies for initialization order
      if (options.dependencies?.length) {
        this.dependencyGraph.set(optionsKey, options.dependencies);
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
        this.initializeServiceNonBlocking(type, newService);
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
    
    // Try to create the service using a factory
    return this.createWorkspaceServiceFromFactory<T>(workspaceId, type);
  }

  /**
   * Attempt to create a workspace service using a factory
   * @param workspaceId The workspace ID
   * @param type The service type
   * @returns The service instance or null if no factory is found
   * @private
   */
  private createWorkspaceServiceFromFactory<T extends ManagedService>(
    workspaceId: string, 
    type: string
  ): T | null {
    // Check for workspace-specific factory first
    let factory: (() => ManagedService) | undefined;
    const workspaceFactories = this.workspaceServiceFactories.get(workspaceId);
    
    if (workspaceFactories) {
      factory = workspaceFactories.get(type);
    }
    
    // If no specific factory is found, check for generic factory function
    if (!factory) {
      const factoryFn = this.workspaceFactoryFunctions.get(type);
      if (factoryFn) {
        factory = () => factoryFn(workspaceId);
      }
    }
    
    // If we found a factory, use it
    if (factory) {
      try {
        this.logger.debug(`Creating workspace service ${workspaceId}:${type} using factory`);
        const newService = factory() as T;
        
        // Register the service with any previously set options
        const optionsKey = this.getWorkspaceServiceKey(workspaceId, type);
        const options = this.factoryOptions.get(optionsKey);
        this.registerWorkspaceService(workspaceId, type, newService, options);
        
        // Initialize if the registry is already initialized
        if (this.initialized) {
          this.initializeWorkspaceServiceNonBlocking(workspaceId, type, newService);
        }
        
        return newService;
      } catch (error) {
        this.logger.error(`Failed to create workspace service ${workspaceId}:${type}`, { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
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
      const optionsKey = this.getWorkspaceServiceKey(workspaceId, type);
      this.factoryOptions.set(optionsKey, options);
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

    // Initialize services in dependency order
    for (const serviceKey of initOrder) {
      await this.initializeServiceByKey(serviceKey);
    }

    this.initialized = true;
    this.logger.info('All services initialized successfully');
  }

  /**
   * Initialize a service by its key (either service type or workspace:type)
   * @param serviceKey The service key
   * @private
   */
  private async initializeServiceByKey(serviceKey: string): Promise<void> {
    // Check if this is a workspace service
    if (serviceKey.includes(':')) {
      // Skip generic workspace factory options
      if (serviceKey.startsWith('*:')) {
        return;
      }
      
      // Parse the workspace ID and service type
      const [workspaceId, serviceType] = serviceKey.split(':');
      const workspaceServiceMap = this.workspaceServices.get(workspaceId);
      
      if (!workspaceServiceMap) {
        this.logger.warn(`Workspace service map not found for ${serviceKey}`);
        return;
      }
      
      const service = workspaceServiceMap.get(serviceType);
      if (!service) {
        this.logger.warn(`Service not found for ${serviceKey}`);
        return;
      }
      
      await this.initializeWorkspaceService(workspaceId, serviceType, service);
    } else {
      // Global service
      const service = this.services.get(serviceKey);
      if (!service) {
        this.logger.warn(`Service not found for ${serviceKey}`);
        return;
      }
      
      await this.initializeService(serviceKey, service);
    }
  }

  /**
   * Initialize a global service
   * @param serviceType The service type
   * @param service The service instance
   * @private
   */
  private async initializeService(serviceType: string, service: ManagedService): Promise<void> {
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

  /**
   * Initialize a workspace service
   * @param workspaceId The workspace ID
   * @param serviceType The service type
   * @param service The service instance
   * @private
   */
  private async initializeWorkspaceService(
    workspaceId: string, 
    serviceType: string, 
    service: ManagedService
  ): Promise<void> {
    try {
      this.logger.debug('Initializing workspace service', { 
        workspaceId, 
        serviceType
      });
      await service.init();
      this.logger.debug('Workspace service initialized', { 
        workspaceId, 
        serviceType 
      });
    } catch (error) {
      this.logger.error('Failed to initialize workspace service', { 
        workspaceId, 
        serviceType, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Workspace service initialization failed for ${workspaceId}.${serviceType}: ${error}`);
    }
  }

  /**
   * Initialize a service in a non-blocking way
   * Used for services created after the registry is initialized
   * @param serviceType The service type
   * @param service The service instance
   * @private
   */
  private initializeServiceNonBlocking(serviceType: string, service: ManagedService): void {
    service.init().catch(error => {
      this.logger.error(`Failed to initialize service ${serviceType}`, { 
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }

  /**
   * Initialize a workspace service in a non-blocking way
   * Used for services created after the registry is initialized
   * @param workspaceId The workspace ID
   * @param serviceType The service type
   * @param service The service instance
   * @private
   */
  private initializeWorkspaceServiceNonBlocking(
    workspaceId: string, 
    serviceType: string, 
    service: ManagedService
  ): void {
    service.init().catch(error => {
      this.logger.error(`Failed to initialize workspace service ${workspaceId}:${serviceType}`, { 
        error: error instanceof Error ? error.message : String(error)
      });
    });
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

    // Clean up services in reverse dependency order
    for (const serviceKey of cleanupOrder) {
      try {
        await this.cleanupServiceByKey(serviceKey);
      } catch (error) {
        // Log the error and continue with other services
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
   * Clean up a service by its key
   * @param serviceKey The service key
   * @private
   */
  private async cleanupServiceByKey(serviceKey: string): Promise<void> {
    // Check if this is a workspace service
    if (serviceKey.includes(':')) {
      // Skip generic workspace factory options
      if (serviceKey.startsWith('*:')) {
        return;
      }
      
      // Parse the workspace ID and service type
      const [workspaceId, serviceType] = serviceKey.split(':');
      const workspaceServiceMap = this.workspaceServices.get(workspaceId);
      
      if (!workspaceServiceMap) {
        return;
      }
      
      const service = workspaceServiceMap.get(serviceType);
      if (!service) {
        return;
      }
      
      await this.cleanupWorkspaceService(workspaceId, serviceType, service);
    } else {
      // Global service
      const service = this.services.get(serviceKey);
      if (!service) {
        return;
      }
      
      await this.cleanupService(serviceKey, service);
    }
  }

  /**
   * Clean up a global service
   * @param serviceType The service type
   * @param service The service instance
   * @private
   */
  private async cleanupService(serviceType: string, service: ManagedService): Promise<void> {
    try {
      this.logger.debug('Cleaning up service', { serviceType });
      await service.cleanup();
      this.logger.debug('Service cleaned up', { serviceType });
    } catch (error) {
      this.logger.error('Failed to clean up service', { 
        serviceType, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Clean up a workspace service
   * @param workspaceId The workspace ID
   * @param serviceType The service type
   * @param service The service instance
   * @private
   */
  private async cleanupWorkspaceService(
    workspaceId: string, 
    serviceType: string, 
    service: ManagedService
  ): Promise<void> {
    try {
      this.logger.debug('Cleaning up workspace service', { 
        workspaceId, 
        serviceType 
      });
      await service.cleanup();
      this.logger.debug('Workspace service cleaned up', { 
        workspaceId, 
        serviceType 
      });
    } catch (error) {
      this.logger.error('Failed to clean up workspace service', { 
        workspaceId, 
        serviceType, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
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
   * Service dependencies for standard services
   * @private
   */
  private static DEFAULT_SERVICE_DEPENDENCIES = {
    'mandrake-manager': [],
    'mcp-manager': ['mandrake-manager'],
    'workspace-manager': ['mandrake-manager'],
    'session-coordinator': ['workspace-manager', 'mcp-manager']
  };

  /**
   * Service initialization priorities for standard services
   * Higher values are initialized first
   * @private
   */
  private static DEFAULT_SERVICE_PRIORITIES = {
    'mandrake-manager': 100,
    'workspace-manager': 50,
    'mcp-manager': 25,
    'session-coordinator': 10
  };

  /**
   * Register standard services for Mandrake
   * @param home The Mandrake home directory
   * @param logger Optional logger
   */
  registerStandardServices(home: string, logger?: Logger): void {
    this.logger.info('Registering standard services');
    
    // Register MandrakeManager
    this.registerMandrakeManager(home);
    
    // Register global services
    this.registerGlobalServices();
    
    // Set up workspace service factories
    this.registerWorkspaceFactories();
    
    // Register services for existing workspaces
    this.registerExistingWorkspaces().catch(error => {
      this.logger.error('Failed to register existing workspaces', {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }
  
  /**
   * Register the MandrakeManager service
   * @param home The Mandrake home directory
   * @private
   */
  private registerMandrakeManager(home: string): void {
    this.logger.info('Registering MandrakeManager service');
    
    const { MandrakeManager } = require('@mandrake/workspace');
    
    this.registerServiceFactory(
      'mandrake-manager',
      () => {
        this.logger.info('Creating MandrakeManager');
        const mandrakeManager = new MandrakeManager(home);
        
        return this.createAndRegisterService(
          'mandrake-manager',
          MandrakeManagerAdapter,
          {
            instance: mandrakeManager,
            logger: new ConsoleLogger({ meta: { service: 'MandrakeManagerAdapter' } })
          },
          {
            dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['mandrake-manager'],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mandrake-manager']
          }
        );
      },
      {
        dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['mandrake-manager'],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mandrake-manager']
      }
    );
  }
  
  /**
   * Register global services (system level)
   * @private
   */
  private registerGlobalServices(): void {
    this.logger.info('Registering global services');
    
    // Import required classes
    const { MCPManager } = require('@mandrake/mcp');
    
    // Register MCPManager factory for system
    this.registerServiceFactory(
      'mcp-manager',
      () => {
        this.logger.info('Creating system MCPManager');
        const mcpManager = new MCPManager();
        
        // Create the adapter directly rather than using createAndRegisterService
        // This is because MCPManagerAdapter has a more specific constructor than our generic interface
        const logger = new ConsoleLogger({ meta: { service: 'MCPManagerAdapter' } });
        const adapter = new MCPManagerAdapter(
          mcpManager,
          {}, // Empty config to start with
          'default', // Config ID
          { logger, isSystem: true }
        );
        
        // Register the service
        this.registerService(
          'mcp-manager',
          adapter,
          {
            dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['mcp-manager'],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mcp-manager']
          }
        );
        
        return adapter;
      },
      {
        dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['mcp-manager'],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mcp-manager']
      }
    );
    
    // Register SessionCoordinator factory for system
    this.registerServiceFactory(
      'session-coordinator',
      () => {
        this.logger.info('Creating system SessionCoordinator');
        
        return this.createAndRegisterService(
          'session-coordinator',
          SessionCoordinatorAdapter,
          {
            instance: 'system', // Use 'system' as the session ID
            options: { isSystem: true },
            logger: new ConsoleLogger({ meta: { service: 'SessionCoordinatorAdapter' } })
          },
          {
            dependencies: ['mandrake-manager', 'mcp-manager'],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['session-coordinator']
          }
        );
      },
      {
        dependencies: ['mandrake-manager', 'mcp-manager'],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['session-coordinator']
      }
    );
  }
  
  /**
   * Register factory functions for workspace-specific services
   * @private
   */
  private registerWorkspaceFactories(): void {
    this.logger.info('Registering workspace factory functions');
    
    // WorkspaceManager factory function
    this.registerWorkspaceFactoryFunction<WorkspaceManagerAdapter>(
      'workspace-manager',
      (workspaceId: string) => {
        this.logger.info('Creating WorkspaceManager', { workspaceId });
        
        return this.createAndRegisterWorkspaceService(
          workspaceId,
          'workspace-manager',
          WorkspaceManagerAdapter,
          {
            instance: workspaceId,
            logger: new ConsoleLogger({ 
              meta: { service: 'WorkspaceManagerAdapter', workspaceId }
            })
          },
          {
            dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['workspace-manager'],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['workspace-manager']
          }
        );
      },
      {
        dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['workspace-manager'],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['workspace-manager']
      }
    );
    
    // MCP Manager factory function for workspaces
    this.registerWorkspaceFactoryFunction<MCPManagerAdapter>(
      'mcp-manager',
      (workspaceId: string) => {
        this.logger.info('Creating workspace MCPManager', { workspaceId });
        
        const { MCPManager } = require('@mandrake/mcp');
        const mcpManager = new MCPManager();
        
        // Create the adapter directly rather than using createAndRegisterWorkspaceService
        const logger = new ConsoleLogger({ meta: { service: 'MCPManagerAdapter', workspaceId } });
        const adapter = new MCPManagerAdapter(
          mcpManager,
          {}, // Empty config to start with
          'default', // Config ID
          { logger, workspaceId }
        );
        
        // Register the workspace service
        this.registerWorkspaceService(
          workspaceId,
          'mcp-manager',
          adapter,
          {
            dependencies: [`workspace-manager`],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mcp-manager']
          }
        );
        
        return adapter;
      },
      {
        dependencies: [`workspace-manager`],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mcp-manager']
      }
    );
    
    // SessionCoordinator factory function for workspaces
    this.registerWorkspaceFactoryFunction<SessionCoordinatorAdapter>(
      'session-coordinator',
      (workspaceId: string) => {
        this.logger.info('Creating workspace SessionCoordinator', { workspaceId });
        
        return this.createAndRegisterWorkspaceService(
          workspaceId,
          'session-coordinator',
          SessionCoordinatorAdapter,
          {
            instance: workspaceId, // Use workspaceId as sessionId
            options: {
              workspaceName: `workspace-${workspaceId}`
            },
            logger: new ConsoleLogger({ 
              meta: { service: 'SessionCoordinatorAdapter', workspaceId }
            })
          },
          {
            dependencies: [`workspace-manager`, `mcp-manager`],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['session-coordinator']
          }
        );
      },
      {
        dependencies: [`workspace-manager`, `mcp-manager`],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['session-coordinator']
      }
    );
  }
  
  /**
   * Register services for existing workspaces
   * @private
   */
  private async registerExistingWorkspaces(): Promise<void> {
    try {
      this.logger.info('Registering services for existing workspaces');
      
      // Get the MandrakeManager adapter
      const mandrakeAdapter = this.getService<MandrakeManagerAdapter>('mandrake-manager');
      if (!mandrakeAdapter) {
        this.logger.warn('Cannot register existing workspaces: MandrakeManager not available');
        return;
      }
      
      // Initialize the MandrakeManager if not already initialized
      if (!mandrakeAdapter.isInitialized()) {
        await mandrakeAdapter.init();
      }
      
      // Get the list of workspaces
      const manager = mandrakeAdapter.getManager();
      let workspaces;
      
      try {
        workspaces = await manager.listWorkspaces();
        
        // Ensure workspaces is an array
        if (!Array.isArray(workspaces)) {
          this.logger.warn('listWorkspaces did not return an array, skipping workspace registration');
          return;
        }
      } catch (error) {
        this.logger.warn('Could not list workspaces, skipping workspace registration', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        return;
      }
      
      // Register services for each workspace
      for (const workspace of workspaces) {
        const workspaceId = workspace.id;
        
        this.logger.info(`Registering services for workspace ${workspaceId}`);
        
        try {
          this.registerWorkspaceServices(workspaceId);
        } catch (error) {
          this.logger.error(`Error registering services for workspace ${workspaceId}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    } catch (error) {
      this.logger.error('Error registering workspace services', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
  
  /**
   * Register services for a specific workspace
   * @param workspaceId The workspace ID
   */
  registerWorkspaceServices(workspaceId: string): void {
    this.logger.info(`Registering services for workspace ${workspaceId}`);
    
    // Register WorkspaceManager factory
    this.registerWorkspaceServiceFactory(
      workspaceId,
      'workspace-manager',
      () => {
        this.logger.info(`Creating WorkspaceManager for ${workspaceId}`);
        
        return this.createAndRegisterWorkspaceService(
          workspaceId,
          'workspace-manager',
          WorkspaceManagerAdapter,
          {
            instance: workspaceId,
            logger: new ConsoleLogger({ 
              meta: { service: 'WorkspaceManagerAdapter', workspaceId }
            })
          },
          {
            dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['workspace-manager'],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['workspace-manager']
          }
        );
      },
      {
        dependencies: ServiceRegistryImpl.DEFAULT_SERVICE_DEPENDENCIES['workspace-manager'],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['workspace-manager']
      }
    );
    
    // Register MCPManager factory
    this.registerWorkspaceServiceFactory(
      workspaceId,
      'mcp-manager',
      () => {
        this.logger.info(`Creating MCPManager for ${workspaceId}`);
        
        const { MCPManager } = require('@mandrake/mcp');
        const mcpManager = new MCPManager();
        
        // Create the adapter directly rather than using createAndRegisterWorkspaceService
        const logger = new ConsoleLogger({ meta: { service: 'MCPManagerAdapter', workspaceId } });
        const adapter = new MCPManagerAdapter(
          mcpManager,
          {}, // Empty config to start with
          'default', // Config ID
          { logger, workspaceId }
        );
        
        // Register the workspace service
        this.registerWorkspaceService(
          workspaceId,
          'mcp-manager',
          adapter,
          {
            dependencies: [`${workspaceId}:workspace-manager`],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mcp-manager']
          }
        );
        
        return adapter;
      },
      {
        dependencies: [`${workspaceId}:workspace-manager`],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['mcp-manager']
      }
    );
    
    // Register SessionCoordinator factory
    this.registerWorkspaceServiceFactory(
      workspaceId,
      'session-coordinator',
      () => {
        this.logger.info(`Creating SessionCoordinator for ${workspaceId}`);
        
        return this.createAndRegisterWorkspaceService(
          workspaceId,
          'session-coordinator',
          SessionCoordinatorAdapter,
          {
            instance: workspaceId, // Use workspaceId as sessionId
            options: {
              workspaceName: `workspace-${workspaceId}`
            },
            logger: new ConsoleLogger({ 
              meta: { service: 'SessionCoordinatorAdapter', workspaceId }
            })
          },
          {
            dependencies: [`${workspaceId}:workspace-manager`, `${workspaceId}:mcp-manager`],
            initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['session-coordinator']
          }
        );
      },
      {
        dependencies: [`${workspaceId}:workspace-manager`, `${workspaceId}:mcp-manager`],
        initializationPriority: ServiceRegistryImpl.DEFAULT_SERVICE_PRIORITIES['session-coordinator']
      }
    );
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
        statuses.set(this.getWorkspaceServiceKey(workspaceId, type), await service.getStatus());
      }
    }
    
    return statuses;
  }
  
  /**
   * Get the MandrakeManager instance
   * @returns The MandrakeManager instance
   * @throws Error if the service is not available
   */
  async getMandrakeManager(): Promise<MandrakeManager> {
    const adapter = this.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!adapter) {
      throw new Error('MandrakeManager service not available in registry');
    }
    return adapter.getManager();
  }
  
  /**
   * Get an MCPManager instance
   * @param workspaceId Optional workspace ID for workspace-specific MCP manager
   * @returns The MCPManager instance
   * @throws Error if the service is not available
   */
  async getMCPManager(workspaceId?: string): Promise<MCPManager> {
    let adapter: MCPManagerAdapter | null;
    
    if (workspaceId) {
      adapter = this.getWorkspaceService<MCPManagerAdapter>(workspaceId, 'mcp-manager');
      if (!adapter) {
        throw new Error(`MCPManager service for workspace ${workspaceId} not available in registry`);
      }
    } else {
      adapter = this.getService<MCPManagerAdapter>('mcp-manager');
      if (!adapter) {
        throw new Error('System MCPManager service not available in registry');
      }
    }
    
    return adapter.getManager();
  }
  
  /**
   * Get a WorkspaceManager instance
   * @param workspaceId The ID of the workspace
   * @returns The WorkspaceManager instance
   * @throws Error if the service is not available
   */
  async getWorkspaceManager(workspaceId: string): Promise<WorkspaceManager> {
    const adapter = this.getWorkspaceService<WorkspaceManagerAdapter>(
      workspaceId,
      'workspace-manager'
    );
    
    if (!adapter) {
      throw new Error(`WorkspaceManager service for workspace ${workspaceId} not available in registry`);
    }
    
    return adapter.getManager();
  }

  /**
   * Get a SessionCoordinator instance
   * @param workspaceId Optional workspace ID for workspace-specific session coordinator
   * @returns The SessionCoordinator instance
   * @throws Error if the service is not available
   */
  async getSessionCoordinator(workspaceId?: string): Promise<SessionCoordinator> {
    let adapter: SessionCoordinatorAdapter | null;
    
    if (workspaceId) {
      adapter = this.getWorkspaceService<SessionCoordinatorAdapter>(
        workspaceId, 
        'session-coordinator'
      );
      
      if (!adapter) {
        throw new Error(`SessionCoordinator service for workspace ${workspaceId} not available in registry`);
      }
    } else {
      adapter = this.getService<SessionCoordinatorAdapter>('session-coordinator');
      if (!adapter) {
        throw new Error('System SessionCoordinator service not available in registry');
      }
    }
    
    return adapter.getCoordinator();
  }

  /**
   * Ensure that required services are available
   * @param requiredServices Services that must be available
   * @param workspaceId Optional workspace ID for workspace services
   * @throws Error if any required service is not available
   */
  async ensureServices(
    requiredServices: string[], 
    workspaceId?: string
  ): Promise<void> {
    const missingServices: string[] = [];
    
    for (const serviceType of requiredServices) {
      let available: boolean;
      
      if (workspaceId) {
        available = !!this.getWorkspaceService(workspaceId, serviceType);
      } else {
        available = !!this.getService(serviceType);
      }
      
      if (!available) {
        missingServices.push(serviceType);
      }
    }
    
    if (missingServices.length > 0) {
      throw new Error(
        `Required services not available: ${missingServices.join(', ')}` +
        (workspaceId ? ` for workspace ${workspaceId}` : '')
      );
    }
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
        const fullType = this.getWorkspaceServiceKey(workspaceId, type);
        if (!graph.has(fullType)) {
          graph.set(fullType, []);
        }
      }
    }
    
    // Services that have been resolved
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
          const workspaceDependency = this.getWorkspaceServiceKey(workspaceId, dependency);
          
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

  /**
   * Get the key used for workspace services in internal maps
   * @param workspaceId The workspace ID
   * @param serviceType The service type
   * @returns The workspace service key
   * @private
   */
  private getWorkspaceServiceKey(workspaceId: string, serviceType: string): string {
    return `${workspaceId}:${serviceType}`;
  }
  
  /**
   * Create and register a service in a single function call
   * @param type The service type
   * @param adapterClass The adapter class to instantiate
   * @param creationOptions Options for creating the service
   * @param registrationOptions Options for registering the service
   * @returns The created service instance
   */
  createAndRegisterService<T extends ManagedService>(
    type: string,
    adapterClass: new (instance: any, options?: any) => T,
    creationOptions: ServiceCreationOptions,
    registrationOptions?: ServiceOptions
  ): T {
    // Create logger meta information
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
      this.registerWorkspaceService(
        creationOptions.workspaceId,
        type,
        adapter,
        registrationOptions
      );
    } else {
      this.registerService(
        type,
        adapter,
        registrationOptions
      );
    }
    
    return adapter;
  }

  /**
   * Create and register a workspace service in a single function call
   * @param workspaceId The workspace ID
   * @param type The service type
   * @param adapterClass The adapter class to instantiate
   * @param creationOptions Options for creating the service
   * @param registrationOptions Options for registering the service
   * @returns The created service instance
   */
  createAndRegisterWorkspaceService<T extends ManagedService>(
    workspaceId: string,
    type: string,
    adapterClass: new (instance: any, options?: any) => T,
    creationOptions: Omit<ServiceCreationOptions, 'workspaceId'>,
    registrationOptions?: ServiceOptions
  ): T {
    return this.createAndRegisterService(
      type,
      adapterClass,
      { ...creationOptions, workspaceId },
      registrationOptions
    );
  }
}

// Export types
export * from './types';