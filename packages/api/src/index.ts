import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeManagers, cleanupManagers } from './managers';
import type { ApiEnv, Managers, ManagerAccessors } from './types';
import { systemRoutes } from './routes/system';
import { workspaceRoutes } from './routes/workspaces';

// Setup for graceful shutdown
let shutdownInitiated = false;
const managers = { current: null as Managers | null };

/**
 * Create and configure the Hono app with routes
 */
export async function createApp(env: ApiEnv = {}): Promise<Hono> {
  const app = new Hono();
  
  // Add middleware
  app.use(cors());
  app.use(logger());
  
  // Initialize managers
  const { managers: mgrs, accessors } = await initializeManagers(env.mandrakeHome);
  managers.current = mgrs;
  
  // API status endpoint
  app.get('/', (c) => c.json({ status: 'Mandrake API is running' }));
  
  // Mount system routes - these handle all /system/* routes
  app.route('/system', systemRoutes(mgrs, accessors));
  
  // Mount workspace routes - these handle all /workspaces/* routes
  app.route('/workspaces', workspaceRoutes(mgrs, accessors));
  
  // Root-level routes that mirror system routes
  // These allow for both /system/config and /config to work
  
  // Create a simplified system router for root-level routes
  const rootSystemRouter = systemRoutes(mgrs, accessors);
  
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
  
  // Cleanup managers if they were initialized
  if (managers.current) {
    try {
      await cleanupManagers(managers.current);
      console.log('Managers cleaned up successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
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