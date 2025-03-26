import type { ManagedService, ServiceStatus } from '../types';
import type { MandrakeManager } from '@mandrake/workspace';
import { type Logger, ConsoleLogger } from '@mandrake/utils';
import { existsSync } from 'fs';

/**
 * Adapter for MandrakeManager that implements the ManagedService interface
 */
export class MandrakeManagerAdapter implements ManagedService {
  private initialized = false;
  private logger: Logger;
  
  /**
   * Create a new MandrakeManagerAdapter
   * 
   * @param mandrakeManager The MandrakeManager instance to adapt
   * @param options Optional configuration
   */
  constructor(
    private readonly mandrakeManager: MandrakeManager,
    options?: { 
      logger?: Logger;
    }
  ) {
    this.logger = options?.logger || new ConsoleLogger({
      meta: { service: 'MandrakeManagerAdapter' }
    });
  }
  
  /**
   * Initialize the MandrakeManager
   * This creates directory structure and initializes all system-level managers
   */
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('MandrakeManager already initialized');
      return;
    }
    
    this.logger.info('Initializing MandrakeManager', {
      rootPath: this.mandrakeManager.paths.root
    });

    try {
      // Initialize the MandrakeManager
      await this.mandrakeManager.init();
      
      this.initialized = true;
      this.logger.info('MandrakeManager initialized successfully', {
        rootPath: this.mandrakeManager.paths.root
      });
    } catch (error) {
      this.logger.error('Failed to initialize MandrakeManager', {
        error: error instanceof Error ? error.message : String(error),
        rootPath: this.mandrakeManager.paths.root
      });
      throw new Error(`MandrakeManager initialization failed: ${error}`);
    }
  }
  
  /**
   * Check if the MandrakeManager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Clean up MandrakeManager resources
   * This should close all sub-managers and release file system resources
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      this.logger.debug('MandrakeManager not initialized, nothing to clean up');
      return;
    }
    
    this.logger.info('Cleaning up MandrakeManager', {
      rootPath: this.mandrakeManager.paths.root
    });
    
    // Track errors to collect them but continue cleanup for all sub-managers
    const errors: Error[] = [];
    
    // Clean up sub-managers that may need explicit cleanup
    const cleanupPromises = [];
    
    // Clean up sessions (assuming it has a close method)
    if (typeof this.mandrakeManager.sessions.close === 'function') {
      cleanupPromises.push(
        this.mandrakeManager.sessions.close().catch(error => {
          this.logger.error('Error cleaning up sessions', {
            error: error instanceof Error ? error.message : String(error)
          });
          errors.push(error instanceof Error ? error : new Error(String(error)));
        })
      );
    }
    
    // Clean up other managers that might have cleanup methods
    const otherManagers = [
      'tools', 'models', 'prompt', 'config'
    ];
    
    for (const managerName of otherManagers) {
      const manager = (this.mandrakeManager as any)[managerName];
      if (manager && typeof manager.cleanup === 'function') {
        cleanupPromises.push(
          manager.cleanup().catch((error: Error) => {
            this.logger.error(`Error cleaning up ${managerName} manager`, {
              error: error instanceof Error ? error.message : String(error)
            });
            errors.push(error instanceof Error ? error : new Error(String(error)));
          })
        );
      }
    }
    
    // Wait for all cleanup operations to complete
    await Promise.all(cleanupPromises);
    
    // Mark as not initialized, even if there were errors
    this.initialized = false;
    
    if (errors.length > 0) {
      this.logger.warn(`${errors.length} errors occurred during cleanup`, {
        errorCount: errors.length
      });
      // Don't throw here to prevent blocking other service cleanup
    }
    
    this.logger.info('MandrakeManager cleaned up successfully', {
      rootPath: this.mandrakeManager.paths.root
    });
  }
  
  /**
   * Get the status of the MandrakeManager
   * Includes details on all sub-managers and workspaces
   */
  async getStatus(): Promise<ServiceStatus> {
    const statusDetails: Record<string, any> = {
      rootPath: this.mandrakeManager.paths.root,
      initialized: this.initialized,
      subManagers: {}
    };
    
    // Check directory structure health
    const rootExists = existsSync(this.mandrakeManager.paths.root);
    const configExists = existsSync(this.mandrakeManager.paths.config);
    const workspacesPathExists = existsSync(this.mandrakeManager.paths.root + '/workspaces');
    
    statusDetails.fileSystem = {
      rootExists,
      configExists,
      workspacesPathExists
    };
    
    // Check sub-managers health
    const subManagerNames = [
      'tools', 'models', 'prompt', 'sessions', 'config'
    ];
    
    let allSubManagersHealthy = true;
    
    for (const managerName of subManagerNames) {
      const manager = (this.mandrakeManager as any)[managerName];
      let managerStatus = { isHealthy: true };
      
      // Check if manager exists
      if (!manager) {
        managerStatus.isHealthy = false;
        allSubManagersHealthy = false;
      } 
      // If manager has a getStatus method, use it
      else if (typeof manager.getStatus === 'function') {
        try {
          managerStatus = manager.getStatus();
        } catch (error) {
          managerStatus = { 
            isHealthy: false
          };
          allSubManagersHealthy = false;
        }
      }
      
      statusDetails.subManagers[managerName] = managerStatus;
    }
    
    // Check workspace registry health
    try {
      const workspaces = this.mandrakeManager.listWorkspaces();
      statusDetails.workspaces = {
        count: (await workspaces).length,
        isHealthy: true
      };
    } catch (error) {
      statusDetails.workspaces = {
        count: 0,
        isHealthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
      allSubManagersHealthy = false;
    }
    
    // Overall health depends on initialization, filesystem, and sub-managers
    const isHealthy = this.initialized && rootExists && configExists && workspacesPathExists && allSubManagersHealthy;
    
    return {
      isHealthy,
      message: this.getStatusMessage(isHealthy, rootExists, configExists, workspacesPathExists, allSubManagersHealthy),
      details: statusDetails,
      statusCode: this.getStatusCode(isHealthy, rootExists, configExists, workspacesPathExists, allSubManagersHealthy)
    };
  }
  
  /**
   * Get the underlying MandrakeManager
   */
  getManager(): MandrakeManager {
    return this.mandrakeManager;
  }
  
  /**
   * Helper to generate status codes based on health state
   * @private
   */
  private getStatusCode(
    isHealthy: boolean, 
    rootExists: boolean, 
    configExists: boolean, 
    workspacesPathExists: boolean, 
    allSubManagersHealthy: boolean
  ): number {
    if (!this.initialized) return 503; // Service Unavailable
    if (!rootExists || !configExists || !workspacesPathExists) return 500; // Internal Server Error (filesystem issues)
    if (!allSubManagersHealthy) return 206; // Partial Content (some sub-managers unhealthy)
    if (isHealthy) return 200; // OK
    return 500; // Internal Server Error (unknown issue)
  }
  
  /**
   * Helper to generate human-readable status messages
   * @private
   */
  private getStatusMessage(
    isHealthy: boolean, 
    rootExists: boolean, 
    configExists: boolean, 
    workspacesPathExists: boolean, 
    allSubManagersHealthy: boolean
  ): string {
    if (!this.initialized) return 'MandrakeManager not initialized';
    if (!rootExists) return 'Mandrake root directory does not exist';
    if (!configExists) return 'Mandrake config directory does not exist';
    if (!workspacesPathExists) return 'Mandrake workspaces directory does not exist';
    if (!allSubManagersHealthy) return 'Some Mandrake sub-managers are unhealthy';
    if (isHealthy) return `MandrakeManager is healthy`;
    return 'Mandrake has unknown health issues';
  }
  
  /**
   * Create a workspace through the MandrakeManager
   * This is a convenience method that delegates to the underlying manager
   */
  async createWorkspace(name: string, description?: string, path?: string): Promise<any> {
    this.logger.debug('Creating workspace through MandrakeManager', {
      name, 
      path
    });
    return await this.mandrakeManager.createWorkspace(name, description, path);
  }
  
  /**
   * Get a workspace by ID from the MandrakeManager
   * This is a convenience method that delegates to the underlying manager
   */
  async getWorkspace(id: string): Promise<any> {
    this.logger.debug('Getting workspace from MandrakeManager', { id });
    return await this.mandrakeManager.getWorkspace(id);
  }
  
  /**
   * List all workspaces registered in the MandrakeManager
   * This is a convenience method that delegates to the underlying manager
   */
  async listWorkspaces(): Promise<any[]> {
    this.logger.debug('Listing workspaces from MandrakeManager');
    return this.mandrakeManager.listWorkspaces();
  }
  
  /**
   * Delete a workspace by ID
   * This is a convenience method that delegates to the underlying manager
   */
  async deleteWorkspace(id: string): Promise<void> {
    this.logger.debug('Deleting workspace from MandrakeManager', { id });
    await this.mandrakeManager.deleteWorkspace(id);
  }
}