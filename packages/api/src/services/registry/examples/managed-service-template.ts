import { ManagedService, ServiceStatus } from '../index';
import { Logger, ConsoleLogger } from '@mandrake/utils';

/**
 * Example of how to implement the ManagedService interface
 * This template can be used as a reference for adapting existing services
 */
export class ExampleManagedService implements ManagedService {
  private initialized = false;
  private resources: any[] = [];
  private logger: Logger;
  
  constructor(
    private readonly name: string,
    options?: { logger?: Logger }
  ) {
    this.logger = options?.logger || new ConsoleLogger({
      meta: { service: name }
    });
  }
  
  /**
   * Initialize the service
   * This should create any necessary resources and prepare the service for use
   */
  async init(): Promise<void> {
    // Skip initialization if already initialized
    if (this.initialized) {
      this.logger.debug('Service already initialized');
      return;
    }
    
    try {
      this.logger.debug('Initializing service');
      
      // Example: Create resources
      this.resources.push({ id: 1, name: 'Example Resource' });
      
      // Example: Initialize any dependencies
      // await this.dependency.someAsyncOperation();
      
      // Mark as initialized
      this.initialized = true;
      this.logger.debug('Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize service', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Cleanup any partially initialized resources
      this.resources = [];
      // Rethrow error to signal initialization failure
      throw error;
    }
  }
  
  /**
   * Check if the service is initialized
   * @returns Whether the service has been successfully initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Clean up the service
   * This should release all resources and prepare the service for shutdown
   */
  async cleanup(): Promise<void> {
    // Skip cleanup if not initialized
    if (!this.initialized) {
      this.logger.debug('Service not initialized, nothing to clean up');
      return;
    }
    
    try {
      this.logger.debug('Cleaning up service');
      
      // Example: Release resources
      for (const resource of this.resources) {
        // await resource.close();
      }
      
      // Clear resources
      this.resources = [];
      
      // Mark as not initialized
      this.initialized = false;
      this.logger.debug('Service cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to clean up service', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Rethrow error to signal cleanup failure
      throw error;
    }
  }
  
  /**
   * Get the current status of the service
   * @returns Status information for the service
   */
  getStatus(): ServiceStatus {
    // Example: Check health based on resources
    const isHealthy = this.initialized && this.resources.length > 0;
    
    return {
      isHealthy,
      message: isHealthy 
        ? `Service ${this.name} is healthy` 
        : `Service ${this.name} is not healthy`,
      details: {
        name: this.name,
        initialized: this.initialized,
        resourceCount: this.resources.length
      }
    };
  }
  
  // Additional service-specific methods...
  
  /**
   * Example service method
   */
  performOperation(): string {
    if (!this.initialized) {
      throw new Error(`Service ${this.name} is not initialized`);
    }
    
    return `Operation performed by ${this.name}`;
  }
}