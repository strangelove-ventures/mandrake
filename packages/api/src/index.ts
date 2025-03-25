import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { ApiEnv } from './types';
import { systemRoutes } from './routes/system';
import { workspaceRoutes } from './routes/workspaces';
import { ServiceRegistryImpl } from './services/registry';
import { 
  MandrakeManagerAdapter, 
  WorkspaceManagerAdapter, 
  MCPManagerAdapter 
} from './services/registry/adapters';
import { MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { ConsoleLogger } from '@mandrake/utils';
import { join, dirname } from 'path';
import os from 'os';
import { existsSync, mkdirSync } from 'fs';

// Setup for graceful shutdown
let shutdownInitiated = false;
const registry = { current: null as ServiceRegistryImpl | null };

/**
 * Create and configure the Hono app with routes
 */
export async function createApp(env: ApiEnv = {}): Promise<Hono> {
  const app = new Hono();
  
  // Add middleware
  app.use(cors());
  app.use(logger());
  
  // Initialize service registry
  const serviceRegistry = new ServiceRegistryImpl({
    logger: new ConsoleLogger({ meta: { component: 'ServiceRegistry' } })
  });
  registry.current = serviceRegistry;
  
  // Resolve Mandrake home directory
  let home;
  if (env.mandrakeHome) {
    // Resolve tilde if present
    if (env.mandrakeHome.startsWith('~')) {
      home = join(process.env.HOME || os.homedir(), env.mandrakeHome.substring(1));
    } else {
      home = env.mandrakeHome;
    }
  } else {
    // Default to ~/.mandrake
    home = join(process.env.HOME || os.homedir(), '.mandrake');
  }
  
  console.log(`Initializing Mandrake with home directory: ${home}`);
  
  // Ensure directory exists
  if (!existsSync(home)) {
    mkdirSync(home, { recursive: true });
  }
  
  // Initialize and register MandrakeManager
  const mandrakeManager = new MandrakeManager(home);
  const mandrakeAdapter = new MandrakeManagerAdapter(mandrakeManager, {
    logger: new ConsoleLogger({ meta: { service: 'MandrakeManagerAdapter' } })
  });
  
  serviceRegistry.registerService(
    'mandrake-manager',
    mandrakeAdapter,
    {
      dependencies: [],
      initializationPriority: 100  // Highest priority - initialize first
    }
  );
  
  // Initialize system MCP manager and register with registry
  const systemMcpManager = new MCPManager();
  const mcpAdapter = new MCPManagerAdapter(
    systemMcpManager,
    {}, // No initial config needed
    'default',
    {
      logger: new ConsoleLogger({ meta: { service: 'SystemMCPManagerAdapter' } })
    }
  );
  
  serviceRegistry.registerService(
    'mcp-manager',
    mcpAdapter,
    {
      dependencies: ['mandrake-manager'],
      initializationPriority: 50
    }
  );
  
  // Initialize registry services (this will initialize MandrakeManager)
  await serviceRegistry.initializeServices();
  
  // Get system tool configs and initialize MCP servers
  try {
    // Get system tool configurations and set up servers
    const active = await mandrakeManager.tools.getActive();
    const toolConfigs = await mandrakeManager.tools.getConfigSet(active);
    
    // For each tool config, potentially start an MCP server
    for (const [toolName, config] of Object.entries(toolConfigs)) {
      if (!config) continue;
      try {
        console.log(`Starting system tool server: ${toolName}`);
        await systemMcpManager.startServer(toolName, config);
      } catch (serverError) {
        console.warn(`Failed to start server for system tool ${toolName}:`, serverError);
      }
    }
  } catch (toolsError) {
    console.warn('Error loading system tools:', toolsError);
  }
  
  // Load existing workspaces
  await loadWorkspaces(mandrakeManager, serviceRegistry);
  
  // API status endpoint
  app.get('/', (c) => c.json({ status: 'Mandrake API is running' }));
  
  // Mount system routes - these handle all /system/* routes
  app.route('/system', systemRoutes(serviceRegistry));
  
  // Mount workspace routes - these handle all /workspaces/* routes
  app.route('/workspaces', workspaceRoutes(serviceRegistry));
  
  // Root-level routes that mirror system routes
  // These allow for both /system/config and /config to work
  
  // Create a simplified system router for root-level routes
  const rootSystemRouter = systemRoutes(serviceRegistry);
  
  // For each root path, forward to the system router
  app.all('/config/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/config', '/system/config')}`, c.req.raw),
    c.env
  ));
  
  app.all('/tools/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/tools', '/system/tools')}`, c.req.raw),
    c.env
  ));
  
  app.all('/models/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/models', '/system/models')}`, c.req.raw),
    c.env
  ));
  
  app.all('/providers/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/providers', '/system/providers')}`, c.req.raw),
    c.env
  ));
  
  app.all('/prompt/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/prompt', '/system/prompt')}`, c.req.raw),
    c.env
  ));
  
  app.all('/dynamic/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/dynamic', '/system/dynamic')}`, c.req.raw),
    c.env
  ));
  
  app.all('/files/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/files', '/system/files')}`, c.req.raw),
    c.env
  ));
  
  app.all('/sessions/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/sessions', '/system/sessions')}`, c.req.raw),
    c.env
  ));
  
  app.all('/streaming/*', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/streaming', '/system/streaming')}`, c.req.raw),
    c.env
  ));
  
  // Handle root paths without wildcards
  app.all('/config', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/config', '/system/config')}`, c.req.raw),
    c.env
  ));
  
  app.all('/tools', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/tools', '/system/tools')}`, c.req.raw),
    c.env
  ));
  
  app.all('/models', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/models', '/system/models')}`, c.req.raw),
    c.env
  ));
  
  app.all('/providers', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/providers', '/system/providers')}`, c.req.raw),
    c.env
  ));
  
  app.all('/prompt', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/prompt', '/system/prompt')}`, c.req.raw),
    c.env
  ));
  
  app.all('/dynamic', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/dynamic', '/system/dynamic')}`, c.req.raw),
    c.env
  ));
  
  app.all('/files', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/files', '/system/files')}`, c.req.raw),
    c.env
  ));
  
  app.all('/sessions', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/sessions', '/system/sessions')}`, c.req.raw),
    c.env
  ));
  
  app.all('/streaming', (c) => rootSystemRouter.fetch(
    new Request(`${c.req.url.replace('/streaming', '/system/streaming')}`, c.req.raw),
    c.env
  ));
  
  return app;
}

/**
 * Load existing workspaces into memory and register with ServiceRegistry
 */
async function loadWorkspaces(
  mandrakeManager: MandrakeManager,
  registry: ServiceRegistryImpl
): Promise<void> {
  try {
    // Get workspace registry from MandrakeManager
    const workspaces = mandrakeManager.listWorkspaces();
    
    for (const workspace of workspaces) {
      try {
        // Get details for this workspace
        let workspaceData;
        try {
          workspaceData = await mandrakeManager.getWorkspace(workspace.id);
        } catch (error) {
          console.warn(`Error getting workspace data for ${workspace.id}:`, error);
          // Skip this workspace if we can't load it properly
          continue;
        }
        
        const resolvedPath = resolveWorkspacePath(workspace.path, workspaceData.name);
        
        // Create and register WorkspaceManager
        const wsManager = workspaceData;
        
        // Create and register the WorkspaceManagerAdapter
        const wsAdapter = new WorkspaceManagerAdapter(wsManager, {
          logger: new ConsoleLogger({ 
            meta: { service: 'WorkspaceManagerAdapter', workspaceId: workspace.id } 
          })
        });
        
        registry.registerWorkspaceService(
          workspace.id,
          'workspace-manager',
          wsAdapter,
          {
            dependencies: ['mandrake-manager'],
            initializationPriority: 10
          }
        );
        
        // Create and register MCPManager
        const mcpManager = new MCPManager();
        
        // Get tool config for this workspace
        let active;
        let toolConfigs = {};
        
        try {
          active = await wsManager.tools.getActive();
          toolConfigs = await wsManager.tools.getConfigSet(active);
        } catch (error) {
          console.warn(`Error getting tool configs for workspace ${workspace.id}:`, error);
          active = 'default';
        }
        
        // Create adapter for MCP Manager
        const mcpAdapter = new MCPManagerAdapter(
          mcpManager,
          toolConfigs,
          active,
          {
            logger: new ConsoleLogger({ 
              meta: { service: 'MCPManagerAdapter', workspaceId: workspace.id } 
            }),
            workspaceId: workspace.id
          }
        );
        
        registry.registerWorkspaceService(
          workspace.id,
          'mcp-manager',
          mcpAdapter,
          {
            dependencies: [`${workspace.id}:workspace-manager`],
            initializationPriority: 5
          }
        );
        
        // Start tool servers for this workspace
        for (const [name, config] of Object.entries(toolConfigs)) {
          if (!config) continue;
          try {
            await mcpManager.startServer(name, config);
          } catch (serverError) {
            console.warn(`Failed to start server for tool ${name} in workspace ${workspace.id}:`, serverError);
          }
        }
      } catch (error) {
        console.error(`Error loading workspace ${workspace.id}:`, error);
        // Continue with other workspaces
      }
    }
  } catch (error) {
    console.error('Error loading workspaces:', error);
  }
}

/**
 * Helper function to resolve workspace paths
 */
function resolveWorkspacePath(path: string, name: string): string {
  // Resolve tilde in path if present
  let resolvedPath = path;
  if (path.startsWith('~')) {
    resolvedPath = join(process.env.HOME || os.homedir(), path.substring(1));
  }
  
  // Determine if we need to get the parent directory
  const isFullWorkspacePath = resolvedPath.endsWith(`/${name}`);
  return isFullWorkspacePath 
    ? dirname(resolvedPath)
    : resolvedPath;
}

/**
 * Handle process cleanup for graceful shutdown
 */
function setupProcessHandlers(): void {
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
  process.on('exit', () => {
    if (!shutdownInitiated) {
      handleShutdown();
    }
  });
}

/**
 * Gracefully shut down the server and cleanup resources
 */
async function handleShutdown(): Promise<void> {
  if (shutdownInitiated) return;
  shutdownInitiated = true;
  
  console.log('Shutting down Mandrake API gracefully...');
  
  // Cleanup registry services if initialized
  if (registry.current) {
    try {
      await registry.current.cleanupServices();
      console.log('Service registry cleaned up successfully');
    } catch (error) {
      console.error('Error during service registry cleanup:', error);
    }
  }
  
  process.exit(0);
}

// Start the server if this file is run directly
if (import.meta.main) {
  setupProcessHandlers();
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  
  createApp()
    .then((app) => {
      console.log(`Mandrake API starting on port ${port}...`);
      
      // @ts-ignore - Bun global is available at runtime
      const server = Bun.serve({
        port,
        fetch: app.fetch,
      });
      
      console.log(`Mandrake API is running at http://localhost:${port}`);
    })
    .catch((error) => {
      console.error('Failed to start Mandrake API:', error);
      process.exit(1);
    });
}

// Export for use in tests or as a module
export default { createApp };