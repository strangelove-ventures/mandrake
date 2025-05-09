import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createBunWebSocket } from 'hono/bun';
import type { ApiEnv, WebSocketManager } from './types';
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

// Create a shared WebSocket manager for the application
const wsManager: WebSocketManager = { upgradeWebSocket: null as any, websocket: null };

/**
 * Initialize the WebSocket manager
 * @returns The initialized WebSocket manager
 */
export function initWebSocketManager(): WebSocketManager {
  const wsAdapter = createBunWebSocket();
  wsManager.upgradeWebSocket = wsAdapter.upgradeWebSocket;
  wsManager.websocket = wsAdapter.websocket;
  return wsManager;
}

/**
 * Create and configure the Hono app with routes
 */
export async function createApp(env: ApiEnv = {}): Promise<{ app: Hono; wsManager: WebSocketManager }> {
  const app = new Hono();
  
  // Initialize the WebSocket manager if not already initialized
  if (!wsManager.websocket) {
    initWebSocketManager();
  }
  
  // Add middleware
  app.use(cors());
  app.use(logger());
  
  // Initialize enhanced service registry
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
  
  // Register standard services (factories for lazy initialization)
  serviceRegistry.registerStandardServices(home, new ConsoleLogger({ 
    meta: { component: 'ServiceRegistration' }
  }));
  
  // Initialize registry services (this will initialize initially registered services)
  await serviceRegistry.initializeServices();
  
  // Register and initialize existing workspaces after core services are ready
  try {
    console.log('Registering existing workspaces after core services initialization');
    await serviceRegistry.registerExistingWorkspaces();
  } catch (error) {
    console.error('Error during workspace registration:', error);
  }
  
  // Get access to the MandrakeManager and MCPManager in a way that doesn't throw if they're not initialized yet
  // This is important for testing where the factories might be registered but not initialized
  try {
    const mandrakeAdapter = serviceRegistry.getService<MandrakeManagerAdapter>('mandrake-manager');
    const mcpAdapter = serviceRegistry.getService<MCPManagerAdapter>('mcp-manager');
    
    if (mandrakeAdapter && mcpAdapter) {
      const mandrakeManager = mandrakeAdapter.getManager();
      const systemMcpManager = mcpAdapter.getManager();
      
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
    } else {
      console.warn('Core services not initialized during startup, waiting for lazy initialization');
    }
  } catch (error) {
    console.warn('Error initializing core services:', error);
  }
  
  // Workspace loading is handled by the registry now via factories
  
  // API status endpoint
  app.get('/', (c) => c.json({ status: 'Mandrake API is running' }));
  
  // Mount system routes - these handle all /system/* routes
  app.route('/system', systemRoutes(serviceRegistry, wsManager));
  
  // Mount workspace routes - these handle all /workspaces/* routes
  app.route('/workspaces', workspaceRoutes(serviceRegistry, wsManager));
  
  // Root-level routes that mirror system routes
  // These allow for both /system/config and /config to work
  
  // Create a simplified system router for root-level routes
  const rootSystemRouter = systemRoutes(serviceRegistry, wsManager);
  
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
  
  return { app, wsManager };
}

/**
 * Load existing workspaces into memory and register with ServiceRegistry
 * 
 * Note: This function is now deprecated and replaced with the enhanced registry's
 * lazy loading functionality via service factories. It is kept here for reference.
 */
async function loadWorkspaces(
  mandrakeManager: MandrakeManager,
  registry: ServiceRegistryImpl
): Promise<void> {
  console.warn('The loadWorkspaces function is deprecated - use registry.registerStandardServices instead');
  // The functionality is now handled by the Enhanced ServiceRegistry and service factories
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
    .then(({ app, wsManager }) => {
      console.log(`Mandrake API starting on port ${port}...`);
      
      // @ts-ignore - Bun global is available at runtime
      const server = Bun.serve({
        port,
        fetch: app.fetch,
        websocket: wsManager.websocket, // Pass the WebSocket handler
      });
      
      console.log(`Mandrake API is running at http://localhost:${port}`);
    })
    .catch((error) => {
      console.error('Failed to start Mandrake API:', error);
      process.exit(1);
    });
}

// Export for use in tests or as a module
export default { createApp, initWebSocketManager, wsManager };