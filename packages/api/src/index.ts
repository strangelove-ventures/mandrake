import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeManagers, cleanupManagers } from './managers';
import type { ApiEnv, Managers, ManagerAccessors } from './types';
import { systemRoutes } from './routes/system';
import { workspaceRoutes } from './routes/workspaces';
import { mandrakeConfigRoutes, workspaceConfigRoutes } from './routes/config';
import { modelsRoutes, providersRoutes } from './routes/models';
import { filesRoutes } from './routes/files';
import { dynamicContextRoutes } from './routes/dynamic';
import { promptRoutes } from './routes/prompt';
import { toolsConfigRoutes, toolsOperationRoutes, serverRoutes, allToolRoutes } from './routes/tools';

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
  
  // Mount system routes
  app.route('/system', systemRoutes(mgrs, accessors));
  
  // Mount config routes directly
  app.route('/config', mandrakeConfigRoutes(mgrs.mandrakeManager.config));
  
  // Mount models routes directly
  app.route('/models', modelsRoutes(mgrs.mandrakeManager.models));
  
  // Mount providers routes directly
  app.route('/providers', providersRoutes(mgrs.mandrakeManager.models));
  
  // Mount tool-related routes
  app.route('/tools', allToolRoutes(mgrs.mandrakeManager.tools, mgrs.systemMcpManager));
  
  // Mount files routes directly
  app.route('/files', filesRoutes(mgrs.mandrakeManager.files));
  
  // Mount dynamic context routes directly
  app.route('/dynamic', dynamicContextRoutes(mgrs.mandrakeManager.dynamic));
  
  // Mount prompt routes directly
  app.route('/prompt', promptRoutes(mgrs.mandrakeManager.prompt));
  
  // Mount workspace routes
  app.route('/workspaces', workspaceRoutes(mgrs, accessors));
  
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