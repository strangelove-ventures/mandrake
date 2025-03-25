import type { ManagedService, ServiceStatus } from '../types';
import type { SessionCoordinator } from '@mandrake/session';
import { type Logger, ConsoleLogger } from '@mandrake/utils';

/**
 * Adapter for SessionCoordinator that implements the ManagedService interface
 */
export class SessionCoordinatorAdapter implements ManagedService {
  private initialized = false;
  private logger: Logger;
  private isActive = false;
  private lastActivityTime = Date.now();
  
  /**
   * Create a new SessionCoordinatorAdapter
   * 
   * @param sessionCoordinator The SessionCoordinator instance to adapt
   * @param sessionId The ID of the session this coordinator manages
   * @param options Optional configuration
   */
  constructor(
    private readonly sessionCoordinator: SessionCoordinator,
    private readonly sessionId: string,
    options?: { 
      logger?: Logger;
      isSystem?: boolean; 
      workspaceId?: string;
      workspaceName?: string;
    }
  ) {
    this.logger = options?.logger || new ConsoleLogger({
      meta: { 
        service: 'SessionCoordinatorAdapter',
        sessionId,
        workspaceId: options?.workspaceId,
        workspaceName: options?.workspaceName,
        isSystem: options?.isSystem || false
      }
    });
  }
  
  /**
   * Initialize the SessionCoordinator
   * Currently there's not much to initialize as most work is done on demand
   */
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('SessionCoordinator already initialized');
      return;
    }
    
    this.logger.info('Initializing SessionCoordinator', {
      sessionId: this.sessionId
    });

    try {
      // Note that SessionCoordinator has no init method itself
      // It initializes lazily when handling requests
      // But we're setting ourselves as initialized to follow the ManagedService pattern

      this.initialized = true;
      this.lastActivityTime = Date.now();
      this.logger.info('SessionCoordinator initialized successfully', {
        sessionId: this.sessionId
      });
    } catch (error) {
      this.logger.error('Failed to initialize SessionCoordinator', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: this.sessionId
      });
      throw new Error(`SessionCoordinator initialization failed: ${error}`);
    }
  }
  
  /**
   * Check if the SessionCoordinator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Clean up SessionCoordinator resources
   * This will terminate any active streaming operations
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      this.logger.debug('SessionCoordinator not initialized, nothing to clean up');
      return;
    }
    
    this.logger.info('Cleaning up SessionCoordinator', {
      sessionId: this.sessionId
    });
    
    try {
      // Call the cleanup method on the coordinator
      // This doesn't do much currently but follows the pattern
      await this.sessionCoordinator.cleanup();

      // Ideally we would also cancel any active streams here
      // But that's not currently supported by the coordinator
      
      this.initialized = false;
      this.logger.info('SessionCoordinator cleaned up successfully', {
        sessionId: this.sessionId
      });
    } catch (error) {
      this.logger.error('Error cleaning up SessionCoordinator', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: this.sessionId
      });
      // Don't rethrow to avoid blocking other service cleanup
    }
  }
  
  /**
   * Get the status of the SessionCoordinator
   */
  getStatus(): ServiceStatus {
    const statusDetails: Record<string, any> = {
      sessionId: this.sessionId,
      initialized: this.initialized,
      isActive: this.isActive,
      lastActivityTime: this.lastActivityTime,
      idleTimeMs: Date.now() - this.lastActivityTime
    };
    
    // Overall health depends on initialization and activity
    const isHealthy = this.initialized;
    
    return {
      isHealthy,
      message: this.getStatusMessage(isHealthy),
      details: statusDetails,
      statusCode: this.getStatusCode(isHealthy)
    };
  }
  
  /**
   * Get the underlying SessionCoordinator
   */
  getCoordinator(): SessionCoordinator {
    return this.sessionCoordinator;
  }

  /**
   * Mark the coordinator as active (handling a request)
   * This updates the activity timestamp
   */
  markActive(): void {
    this.isActive = true;
    this.lastActivityTime = Date.now();
    this.logger.debug('Marked coordinator as active', {
      sessionId: this.sessionId
    });
  }

  /**
   * Mark the coordinator as inactive (request completed)
   * This updates the activity timestamp but marks it as not actively processing
   */
  markInactive(): void {
    this.isActive = false;
    this.lastActivityTime = Date.now();
    this.logger.debug('Marked coordinator as inactive', {
      sessionId: this.sessionId
    });
  }

  /**
   * Get the time in milliseconds since the last activity
   */
  getIdleTimeMs(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Stream a request using the underlying coordinator
   * This method marks the coordinator as active during processing
   */
  async streamRequest(requestContent: string): Promise<{
    responseId: string;
    stream: AsyncIterable<any>;
    completionPromise: Promise<void>;
  }> {
    this.markActive();
    
    try {
      // Use the underlying coordinator to stream the request
      const result = await this.sessionCoordinator.streamRequest(this.sessionId, requestContent);
      
      // Wrap the completion promise to mark inactive when done
      const wrappedPromise = result.completionPromise.finally(() => {
        this.markInactive();
      });
      
      return {
        responseId: result.responseId,
        stream: result.stream,
        completionPromise: wrappedPromise
      };
    } catch (error) {
      // If there's an error, make sure we mark as inactive
      this.markInactive();
      throw error;
    }
  }
  
  /**
   * Build context for a session using the underlying coordinator
   */
  async buildContext(sessionId: string) {
    this.lastActivityTime = Date.now();
    return this.sessionCoordinator.buildContext(sessionId);
  }
  
  /**
   * Helper to generate status codes based on health state
   * @private
   */
  private getStatusCode(isHealthy: boolean): number {
    if (!this.initialized) return 503; // Service Unavailable
    if (isHealthy) return 200; // OK
    return 500; // Internal Server Error (unknown issue)
  }
  
  /**
   * Helper to generate human-readable status messages
   * @private
   */
  private getStatusMessage(isHealthy: boolean): string {
    if (!this.initialized) return 'SessionCoordinator not initialized';
    if (isHealthy) {
      return this.isActive
        ? `SessionCoordinator for session ${this.sessionId} is active and healthy`
        : `SessionCoordinator for session ${this.sessionId} is idle and healthy`;
    }
    return `SessionCoordinator for session ${this.sessionId} has unknown health issues`;
  }
}