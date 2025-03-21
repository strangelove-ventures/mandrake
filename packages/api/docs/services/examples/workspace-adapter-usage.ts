/**
 * Example demonstrating how to use the WorkspaceManagerAdapter with the ServiceRegistry
 */
import { ServiceRegistryImpl } from '../../../src/services/registry';
import { WorkspaceManagerAdapter, MCPManagerAdapter } from '../../../src/services/registry/adapters';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { ConsoleLogger } from '@mandrake/utils';

async function main() {
  // Create a logger for the registry
  const logger = new ConsoleLogger({ meta: { component: 'ServiceRegistryExample' } });
  
  // Create the service registry
  const registry = new ServiceRegistryImpl({ logger });
  
  // Generate IDs for services
  const workspaceId = 'example-workspace-id';
  const workspaceName = 'example-workspace';
  const workspaceRoot = '/path/to/workspace';
  
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
      // Dependencies - add any services this depends on
      dependencies: [],
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
  
  // Get a specific service
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
 * 2. Registering WorkspaceManagerAdapter with the registry
 * 3. Registering MCPManagerAdapter with dependency on WorkspaceManager
 * 4. Initializing all services in dependency order
 * 5. Getting service status information
 * 6. Retrieving a specific service from the registry
 * 7. Cleaning up all services in the correct order
 * 
 * The key benefit is that the ServiceRegistry handles dependency ordering
 * and lifecycle management, ensuring that services are initialized and
 * cleaned up in the correct order.
 */