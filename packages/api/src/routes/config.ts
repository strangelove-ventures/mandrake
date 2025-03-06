import { Hono } from 'hono';
import type { MandrakeConfigManager, WorkspaceConfigManager } from '@mandrake/workspace';

/**
 * Create reusable routes for mandrake config management
 */
export function mandrakeConfigRoutes(configManager: MandrakeConfigManager) {
  const app = new Hono();
  
  // Get current configuration
  app.get('/', async (c) => {
    try {
      const config = await configManager.getConfig();
      return c.json(config);
    } catch (error) {
      console.error('Error getting Mandrake configuration:', error);
      return c.json({ error: 'Failed to get Mandrake configuration' }, 500);
    }
  });
  
  // Update configuration
  app.put('/', async (c) => {
    try {
      const config = await c.req.json();
      await configManager.updateConfig(config);
      return c.json({ success: true });
    } catch (error) {
      console.error('Error updating Mandrake configuration:', error);
      return c.json({ error: 'Failed to update Mandrake configuration' }, 500);
    }
  });
  
  return app;
}

/**
 * Create reusable routes for workspace config management
 */
export function workspaceConfigRoutes(configManager: WorkspaceConfigManager) {
  const app = new Hono();
  
  // Get current configuration
  app.get('/', async (c) => {
    try {
      const config = await configManager.getConfig();
      return c.json(config);
    } catch (error) {
      console.error('Error getting workspace configuration:', error);
      return c.json({ error: 'Failed to get workspace configuration' }, 500);
    }
  });
  
  // Update configuration
  app.put('/', async (c) => {
    try {
      const config = await c.req.json();
      await configManager.updateConfig(config);
      return c.json({ success: true });
    } catch (error) {
      console.error('Error updating workspace configuration:', error);
      return c.json({ error: 'Failed to update workspace configuration' }, 500);
    }
  });
  
  return app;
}