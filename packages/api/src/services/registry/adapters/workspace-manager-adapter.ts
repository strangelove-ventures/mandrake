import type { ManagedService, ServiceStatus } from '../types';
import type { WorkspaceManager } from '@mandrake/workspace';
import { type Logger, ConsoleLogger } from '@mandrake/utils';
import { existsSync } from 'fs';

/**
 * Adapter for WorkspaceManager that implements the ManagedService interface
 */
export class WorkspaceManagerAdapter implements ManagedService {
  private initialized = false;
  private logger: Logger;
  
  /**
   * The workspace manager instance being adapted
   */
  private workspaceManager?: WorkspaceManager;
  
  /**
   * The workspace ID 
   */
  private workspaceId: string;

  /**
   * Create a new WorkspaceManagerAdapter
   * 
   * @param workspaceIdOrManager Either the workspace ID or a WorkspaceManager instance
   * @param options Optional configuration
   */
  constructor(
    workspaceIdOrManager: string | WorkspaceManager,
    private readonly options?: { 
      logger?: Logger;
    }
  ) {
    if (typeof workspaceIdOrManager === 'string') {
      // We were given a workspace ID
      this.workspaceId = workspaceIdOrManager;
      this.logger = options?.logger || new ConsoleLogger({
        meta: { 
          service: 'WorkspaceManagerAdapter',
          workspaceId: this.workspaceId
        }
      });
    } else {
      // We were given a workspace manager instance
      this.workspaceManager = workspaceIdOrManager;
      this.workspaceId = workspaceIdOrManager.id;
      this.logger = options?.logger || new ConsoleLogger({
        meta: { 
          service: 'WorkspaceManagerAdapter',
          workspaceId: workspaceIdOrManager.id,
          workspaceName: workspaceIdOrManager.name
        }
      });
    }
  }
  
  /**
   * Initialize the WorkspaceManager
   * This creates directory structure and initializes all sub-managers
   */
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('WorkspaceManager already initialized');
      return;
    }
    
    try {
      // If we don't have a workspace manager yet but have a workspace ID,
      // we need to create and initialize the workspace manager
      if (!this.workspaceManager && this.workspaceId) {
        this.logger.info('Creating WorkspaceManager from ID', {
          workspaceId: this.workspaceId
        });
        
        // We need to get the MandrakeManager to get the workspace data
        // This would normally be done through the service registry
        // For now, we'll use a simple approach to get it working
        const { MandrakeManager } = require('@mandrake/workspace');
        const mandrakeHome = process.env.MANDRAKE_HOME || '~/.mandrake';
        const mandrakeManager = new MandrakeManager(mandrakeHome);
        await mandrakeManager.init();
        
        // Get the workspace data
        const workspaceData = await mandrakeManager.getWorkspace(this.workspaceId);
        if (!workspaceData) {
          throw new Error(`Workspace ${this.workspaceId} not found`);
        }
        
        // Create workspace manager
        const { WorkspaceManager } = require('@mandrake/workspace');
        this.workspaceManager = new WorkspaceManager(
          workspaceData.paths.root,
          workspaceData.name,
          workspaceData.id
        );
        
        // Get workspace description
        const wsConfig = await workspaceData.config.getConfig();
        
        this.logger.info('Initializing WorkspaceManager', {
          id: this.workspaceId,
          name: workspaceData.name,
          path: workspaceData.paths.root
        });
        
        // Initialize the workspace manager
        await (this.workspaceManager as any).init(wsConfig.description);
      } 
      // If we already have a workspace manager, just initialize it
      else if (this.workspaceManager) {
        this.logger.info('Initializing existing WorkspaceManager', {
          id: this.workspaceManager.id,
          name: this.workspaceManager.name,
          path: this.workspaceManager.paths.root
        });
        
        await this.workspaceManager.init();
      }
      else {
        throw new Error('No workspace manager or workspace ID provided');
      }
      
      this.initialized = true;
      this.logger.info('WorkspaceManager initialized successfully', {
        id: this.workspaceId,
        name: this.workspaceManager?.name
      });
    } catch (error) {
      this.logger.error('Failed to initialize WorkspaceManager', {
        error: error instanceof Error ? error.message : String(error),
        id: this.workspaceId
      });
      throw new Error(`WorkspaceManager initialization failed: ${error}`);
    }
  }
  
  /**
   * Check if the WorkspaceManager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Clean up WorkspaceManager resources
   * This should close all sub-managers and release file system resources
   */
  async cleanup(): Promise<void> {
    if (!this.initialized || !this.workspaceManager) {
      this.logger.debug('WorkspaceManager not initialized, nothing to clean up');
      return;
    }
    
    this.logger.info('Cleaning up WorkspaceManager', {
      id: this.workspaceId,
      name: this.workspaceManager.name
    });
    
    // Track errors to collect them but continue cleanup for all sub-managers
    const errors: Error[] = [];
    
    // Clean up sub-managers that may need explicit cleanup
    const cleanupPromises = [];
    
    // Clean up sessions (assuming it has a close method)
    if (typeof this.workspaceManager.sessions?.close === 'function') {
      cleanupPromises.push(
        this.workspaceManager.sessions.close().catch(error => {
          this.logger.error('Error cleaning up sessions', {
            error: error instanceof Error ? error.message : String(error)
          });
          errors.push(error instanceof Error ? error : new Error(String(error)));
        })
      );
    }
    
    // Clean up other managers that might have cleanup methods
    const otherManagers = [
      'tools', 'models', 'prompt', 'dynamic', 'files', 'config'
    ];
    
    for (const managerName of otherManagers) {
      const manager = (this.workspaceManager as any)[managerName];
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
    
    this.logger.info('WorkspaceManager cleaned up successfully', {
      id: this.workspaceId,
      name: this.workspaceManager.name
    });
  }
  
  /**
   * Get the status of the WorkspaceManager
   * Includes details on all sub-managers
   */
  async getStatus(): Promise<ServiceStatus> {
    // If not initialized at all, return basic status
    if (!this.initialized || !this.workspaceManager) {
      return {
        isHealthy: false,
        statusCode: 503,
        message: 'WorkspaceManager not initialized',
        details: {
          id: this.workspaceId,
          initialized: false
        }
      };
    }
    
    const statusDetails: Record<string, any> = {
      id: this.workspaceId,
      name: this.workspaceManager.name,
      path: this.workspaceManager.paths.root,
      initialized: this.initialized,
      subManagers: {}
    };
    
    // Check directory structure health
    const rootExists = existsSync(this.workspaceManager.paths.root);
    const wsDirExists = existsSync(this.workspaceManager.paths.wsDir);
    const configExists = existsSync(this.workspaceManager.paths.config);
    
    statusDetails.fileSystem = {
      rootExists,
      wsDirExists,
      configExists
    };
    
    // Check sub-managers health
    const subManagerNames = [
      'tools', 'models', 'prompt', 'dynamic', 'files', 'sessions', 'config'
    ];
    
    let allSubManagersHealthy = true;
    
    for (const managerName of subManagerNames) {
      const manager = (this.workspaceManager as any)[managerName];
      let managerStatus = { isHealthy: true };
      
      // Check if manager exists
      if (!manager) {
        managerStatus.isHealthy = false;
        allSubManagersHealthy = false;
      } 
      // If manager has a getStatus method, use it
      else if (typeof manager.getStatus === 'function') {
        try {
          managerStatus = await manager.getStatus();
        } catch (error) {
          managerStatus = { 
            isHealthy: false
          };
          allSubManagersHealthy = false;
        }
      }
      
      statusDetails.subManagers[managerName] = managerStatus;
    }
    
    // Overall health depends on initialization, filesystem, and sub-managers
    const isHealthy = this.initialized && rootExists && wsDirExists && configExists && allSubManagersHealthy;
    
    return {
      isHealthy,
      message: this.getStatusMessage(isHealthy, rootExists, wsDirExists, configExists, allSubManagersHealthy),
      details: statusDetails,
      statusCode: this.getStatusCode(isHealthy, rootExists, wsDirExists, configExists, allSubManagersHealthy)
    };
  }
  
  /**
   * Get the underlying WorkspaceManager
   * This will throw an error if the adapter is not initialized
   */
  getManager(): WorkspaceManager {
    if (!this.workspaceManager) {
      throw new Error('WorkspaceManager not initialized. Call init() first.');
    }
    return this.workspaceManager;
  }
  
  /**
   * Helper to generate status codes based on health state
   * @private
   */
  private getStatusCode(
    isHealthy: boolean, 
    rootExists: boolean, 
    wsDirExists: boolean, 
    configExists: boolean, 
    allSubManagersHealthy: boolean
  ): number {
    if (!this.initialized) return 503; // Service Unavailable
    if (!rootExists || !wsDirExists || !configExists) return 500; // Internal Server Error (filesystem issues)
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
    wsDirExists: boolean, 
    configExists: boolean, 
    allSubManagersHealthy: boolean
  ): string {
    if (!this.initialized) return 'WorkspaceManager not initialized';
    if (!rootExists) return 'Workspace root directory does not exist';
    if (!wsDirExists) return 'Workspace .ws directory does not exist';
    if (!configExists) return 'Workspace config directory does not exist';
    if (!allSubManagersHealthy) return 'Some workspace sub-managers are unhealthy';
    if (isHealthy) return `WorkspaceManager ${(this.workspaceManager as any).name} (${(this.workspaceManager as any).id}) is healthy`;
    return 'Workspace has unknown health issues';
  }
}