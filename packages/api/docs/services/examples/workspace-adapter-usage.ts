/**
 * Example demonstrating how to use service adapters with the ServiceRegistry
 */
import { ServiceRegistryImpl } from '../../../src/services/registry';
import { 
  WorkspaceManagerAdapter, 
  MCPManagerAdapter,
  MandrakeManagerAdapter
} from '../../../src/services/registry/adapters';
import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { ConsoleLogger } from '@mandrake/utils';

async function main() {
  // Create a logger for the registry
  const logger = new ConsoleLogger({ meta: { component: 'ServiceRegistryExample' } });
  
  // Create the service registry
  const registry = new ServiceRegistryImpl({ logger });
  
  // Define paths for MandrakeManager and WorkspaceManager
  const mandrakeRoot = '/path/to/mandrake';
  const workspaceId = 'example-workspace-id';
  const workspaceName = 'example-workspace';
  const workspaceRoot = `${mandrakeRoot}/workspaces/${workspaceName}`;
  
  // Initialize MandrakeManager
  const mandrakeManager = new MandrakeManager(mandrakeRoot);
  
  // Create the MandrakeManagerAdapter
  const mandrakeAdapter = new MandrakeManagerAdapter(mandrakeManager, {
    logger: new ConsoleLogger({ meta: { service: 'MandrakeManagerAdapter' } })
  });
  
  // Register the MandrakeManager service with the registry
  registry.registerService(
    'mandrake-manager',            // Service type
    mandrakeAdapter,               // Service instance
    {
      dependencies: [],
      initializationPriority: 100  // Highest priority - initialize first
    }
  );
  
  // Initialize WorkspaceManager
  const workspaceManager = new WorkspaceManager(workspaceRoot, workspaceName, workspaceId);
  
  // Create the WorkspaceManagerAdapter
  const workspaceAdapter = new WorkspaceManagerAdapter(workspaceManager, {
    logger: new ConsoleLogger({ meta: { service: 'WorkspaceManagerAdapter', workspaceId } })
  });
  
  // Register the workspace service with the registry
  registry.registerWorkspaceService(
    workspaceId,               // Workspace ID
    'workspace-manager',       // Service type
    workspaceAdapter,          // Service instance
    {
      // Workspace manager depends on Mandrake manager being initialized
      dependencies: ['mandrake-manager'],
      // Higher priority means it will be initialized earlier
      initializationPriority: 10
    }
  );
  
  // Create MCPManager for the workspace
  const mcpManager = new MCPManager();
  
  // Example tool configuration for the workspace
  const toolConfig = {
    'filesystem': {
      type: 'filesystem',
      config: {
        path: `${workspaceRoot}/.ws/mcpdata`,
        mountPath: '/data'
      }
    }
  };
  
  // Create the MCPManagerAdapter
  const mcpAdapter = new MCPManagerAdapter(
    mcpManager,
    toolConfig,
    'default',
    {
      logger: new ConsoleLogger({ meta: { service: 'MCPManagerAdapter', workspaceId } }),
      workspaceId
    }
  );
  
  // Register the MCP service with the registry, with a dependency on the workspace manager
  registry.registerWorkspaceService(
    workspaceId,               // Workspace ID
    'mcp-manager',             // Service type
    mcpAdapter,                // Service instance
    {
      // MCPManager depends on WorkspaceManager for its directory structure
      dependencies: ['workspace-manager'],
      initializationPriority: 5
    }
  );
  
  // Initialize all services in dependency order
  logger.info('Initializing all services...');
  await registry.initializeServices();
  
  // Check status of all services
  const statuses = registry.getAllServiceStatuses();
  logger.info('Service statuses:', { 
    statuses: Object.fromEntries(statuses.entries())
  });
  
  // Get global services
  const mdManager = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
  
  if (mdManager) {
    logger.info('Got mandrake manager service', {
      rootPath: mdManager.getManager().paths.root,
      initialized: mdManager.isInitialized()
    });
    
    // List all workspaces (after initialization)
    const workspaces = mdManager.listWorkspaces();
    logger.info('Workspaces', { count: workspaces.length });
  }
  
  // Get workspace-specific services
  const wsManager = registry.getWorkspaceService<WorkspaceManagerAdapter>(
    workspaceId, 
    'workspace-manager'
  );
  
  if (wsManager) {
    logger.info('Got workspace manager service', {
      id: wsManager.getManager().id,
      name: wsManager.getManager().name,
      initialized: wsManager.isInitialized()
    });
  }
  
  // Clean up all services
  logger.info('Cleaning up all services...');
  await registry.cleanupServices();
}

// Run the example (don't actually execute this in the module)
// main().catch(console.error);

/**
 * This example demonstrates:
 * 
 * 1. Creating a ServiceRegistry
 * 2. Registering MandrakeManagerAdapter as a global service
 * 3. Registering WorkspaceManagerAdapter with dependency on MandrakeManager
 * 4. Registering MCPManagerAdapter with dependency on WorkspaceManager
 * 5. Initializing all services in dependency order
 * 6. Getting service status information
 * 7. Retrieving global and workspace-specific services from the registry
 * 8. Managing workspaces through the MandrakeManager service
 * 9. Cleaning up all services in the correct order
 * 
 * The key benefits include:
 * - The ServiceRegistry handles dependency ordering and lifecycle management
 * - Clear separation between global and workspace-specific services
 * - Consistent initialization and cleanup procedures across all services
 * - Health status reporting and monitoring for all services
 */