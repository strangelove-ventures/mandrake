import { ManagedService, ServiceOptions, ServiceRegistry, ServiceStatus } from './types';
import { ConsoleLogger, Logger, LogMeta } from '@mandrake/utils';

/**
 * Default logger implementation for ServiceRegistry
 */
function createDefaultLogger(): Logger {
  return new ConsoleLogger({
    meta: { component: 'ServiceRegistry' }
  });
}

/**
 * Implementation of the ServiceRegistry interface
 */
export class ServiceRegistryImpl implements ServiceRegistry {
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
    const service = this.services.get(type) as T | undefined;
    return service || null;
  }

  /**
   * Get a workspace-specific service
   * @param workspaceId The ID of the workspace
   * @param type The service type to retrieve
   * @returns The service instance or null if not found
   */
  getWorkspaceService<T extends ManagedService>(workspaceId: string, type: string): T | null {
    const workspaceServiceMap = this.workspaceServices.get(workspaceId);
    
    if (!workspaceServiceMap) {
      return null;
    }

    const service = workspaceServiceMap.get(type) as T | undefined;
    return service || null;
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
  getServiceStatus(type: string, workspaceId?: string): ServiceStatus | null {
    if (workspaceId) {
      const service = this.getWorkspaceService(workspaceId, type);
      return service ? service.getStatus() : null;
    } else {
      const service = this.getService(type);
      return service ? service.getStatus() : null;
    }
  }

  /**
   * Get the status of all registered services
   * @returns Map of service type to status
   */
  getAllServiceStatuses(): Map<string, ServiceStatus> {
    const statuses = new Map<string, ServiceStatus>();
    
    // Get global service statuses
    for (const [type, service] of this.services.entries()) {
      statuses.set(type, service.getStatus());
    }
    
    // Get workspace service statuses
    for (const [workspaceId, serviceMap] of this.workspaceServices.entries()) {
      for (const [type, service] of serviceMap.entries()) {
        statuses.set(`${workspaceId}:${type}`, service.getStatus());
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

export * from './types';