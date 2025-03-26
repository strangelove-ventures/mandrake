import { type Logger, ConsoleLogger } from '@mandrake/utils';
import { type EnhancedServiceRegistry } from './index';
import { 
  MandrakeManagerAdapter, 
  MCPManagerAdapter, 
  WorkspaceManagerAdapter,
  SessionCoordinatorAdapter
} from './adapters';
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';

/**
 * Register standard service factories for the Mandrake API
 * @param registry The service registry
 * @param home The Mandrake home directory
 * @param logger Optional logger
 */
export function registerStandardServiceFactories(
  registry: EnhancedServiceRegistry,
  home: string,
  logger?: Logger
): void {
  // Create logger if not provided
  const log = logger || new ConsoleLogger({ 
    meta: { component: 'ServiceFactories' } 
  });
  
  // Register MandrakeManager factory
  registry.registerServiceFactory('mandrake-manager', () => {
    log.info('Creating MandrakeManager');
    const mandrakeManager = new MandrakeManager(home);
    
    // Initialize in the adapter, not in the factory
    const adapter = new MandrakeManagerAdapter(mandrakeManager, { 
      logger: new ConsoleLogger({ meta: { service: 'MandrakeManagerAdapter' } })
    });
    
    return adapter;
  });
  
  // Register MCPManager factory
  registry.registerServiceFactory('mcp-manager', () => {
    log.info('Creating system MCPManager');
    const mcpManager = new MCPManager();
    
    // We'll initialize tool configurations in the adapter's init method,
    // not during factory creation
    return new MCPManagerAdapter(
      mcpManager,
      {}, // Start with empty config
      'default',
      {
        logger: new ConsoleLogger({ meta: { service: 'MCPManagerAdapter' } })
      }
    );
  }, { dependencies: ['mandrake-manager'] });
  
  // Register WorkspaceManager factory function
  registry.registerWorkspaceFactoryFunction<WorkspaceManagerAdapter>('workspace-manager', (workspaceId: string) => {
    log.info('Creating WorkspaceManager', { workspaceId });
    
    try {
      // Create the adapter - initialization will happen in the adapter's init() method
      return new WorkspaceManagerAdapter(
        // We'll pass the workspaceId and let the adapter handle initialization
        workspaceId,
        {
          logger: new ConsoleLogger({ 
            meta: { service: 'WorkspaceManagerAdapter', workspaceId }
          })
        }
      );
    } catch (error) {
      log.error(`Error creating workspace manager for ${workspaceId}`, { error });
      throw error;
    }
  }, { dependencies: ['mandrake-manager'] });
  
  // Register MCP Manager factory function for workspaces
  registry.registerWorkspaceFactoryFunction<MCPManagerAdapter>('mcp-manager', (workspaceId: string) => {
    log.info('Creating workspace MCPManager', { workspaceId });
    
    // Create new MCP Manager
    const mcpManager = new MCPManager();
    
    // Create the adapter with minimal initialization
    // The adapter will load configs during its init() method
    return new MCPManagerAdapter(
      mcpManager,
      {}, // Start with empty config
      'default',
      {
        logger: new ConsoleLogger({ 
          meta: { service: 'MCPManagerAdapter', workspaceId }
        }),
        workspaceId
      }
    );
  }, { dependencies: ['workspace-manager'] });
  
  // Register SessionCoordinator factory function for system
  registry.registerServiceFactory('session-coordinator', () => {
    log.info('Creating system SessionCoordinator');
    
    // Create adapter with system configuration options 
    return new SessionCoordinatorAdapter(
      'system', // sessionId
      {
        logger: new ConsoleLogger({ meta: { service: 'SessionCoordinatorAdapter' } }),
        isSystem: true
      }
    );
  }, { dependencies: ['mandrake-manager', 'mcp-manager'] });
  
  // Register SessionCoordinator factory function for workspaces
  registry.registerWorkspaceFactoryFunction<SessionCoordinatorAdapter>('session-coordinator', (workspaceId: string) => {
    log.info('Creating workspace SessionCoordinator', { workspaceId });
    
    // Create adapter with workspace configuration options
    // The adapter will handle getting the dependencies during initialization
    return new SessionCoordinatorAdapter(
      workspaceId, // Use workspaceId as sessionId
      {
        workspaceId,
        workspaceName: `workspace-${workspaceId}`,
        logger: new ConsoleLogger({ 
          meta: { service: 'SessionCoordinatorAdapter', workspaceId }
        })
      }
    );
  }, { dependencies: ['workspace-manager', 'mcp-manager'] });
}