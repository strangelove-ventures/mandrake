# Service Adapters

This directory will contain adapter classes that implement the ManagedService interface for existing services.

## Adapter Pattern

When adapting existing services to work with the Service Registry, use the adapter pattern to avoid modifying the original services.

### Example:

```typescript
// For a service like MCPManager
import { ManagedService, ServiceStatus } from '../index';
import { MCPManager } from '@mandrake/mcp';
import { Logger, ConsoleLogger } from '@mandrake/utils';

export class MCPManagerAdapter implements ManagedService {
  private initialized = false;
  private logger: Logger;
  
  constructor(
    private readonly mcpManager: MCPManager,
    options?: { logger?: Logger }
  ) {
    this.logger = options?.logger || new ConsoleLogger({
      meta: { service: 'MCPManagerAdapter' }
    });
  }
  
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.logger.debug('Initializing MCPManager');
      // Call any initialization methods on the managed service
      // The MCPManager might need to be modified to expose these methods
      this.initialized = true;
      this.logger.debug('MCPManager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MCPManager', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  async cleanup(): Promise<void> {
    if (!this.initialized) return;
    
    try {
      this.logger.debug('Cleaning up MCPManager');
      // Clean up managed resources
      // For MCPManager, need to stop all servers
      const serverIds = Array.from(this.mcpManager.getServerIds());
      for (const id of serverIds) {
        await this.mcpManager.stopServer(id).catch(err => {
          this.logger.error(`Error stopping server ${id}`, {
            error: err instanceof Error ? err.message : String(err)
          });
        });
      }
      
      this.initialized = false;
      this.logger.debug('MCPManager cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to clean up MCPManager', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  getStatus(): ServiceStatus {
    // Check the status of the managed service
    const serverStatuses = new Map<string, boolean>();
    
    // This depends on the MCPManager implementation
    // Ideally, it would have a method like getServerStatuses()
    const allHealthy = true; // This should be calculated based on server statuses
    
    return {
      isHealthy: allHealthy,
      details: {
        initialized: this.initialized,
        serverCount: serverStatuses.size,
        servers: Object.fromEntries(serverStatuses)
      }
    };
  }
  
  // Proxy methods to the underlying service
  
  getManager(): MCPManager {
    return this.mcpManager;
  }
}
```

## Implementation Approach

1. **Start with core system services**:
   - MCPManager
   - SessionManager
   - MandrakeManager
   - WorkspaceManager

2. **Then add workspace-specific services**:
   - WorkspaceSessionManager
   - WorkspaceToolsManager
   - Other workspace services

3. **Proxy important methods** to the underlying service to maintain the same API.

4. **Add proper initialization and cleanup logic** based on the service's requirements.

## Considerations

- Ensure all resources are properly released during cleanup
- Handle initialization failures gracefully
- Provide meaningful status information
- Use consistent logging patterns
- Consider dependency ordering during initialization