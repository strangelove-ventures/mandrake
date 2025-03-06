import { Hono } from 'hono';
import { PromptManager } from '@mandrake/workspace';

/**
 * Create reusable routes for prompt management
 * These routes can be mounted at either system or workspace level
 */
export function promptRoutes(promptManager: PromptManager) {
  const app = new Hono();
  
  // Get current prompt configuration
  app.get('/', async (c) => {
    try {
      const config = await promptManager.getConfig();
      return c.json(config);
    } catch (error) {
      console.error('Error getting prompt configuration:', error);
      return c.json({ error: 'Failed to get prompt configuration' }, 500);
    }
  });
  
  // Update prompt configuration
  app.put('/', async (c) => {
    try {
      const config = await c.req.json();
      await promptManager.updateConfig(config);
      return c.json({ success: true });
    } catch (error) {
      console.error('Error updating prompt configuration:', error);
      return c.json({ error: 'Failed to update prompt configuration' }, 500);
    }
  });
  
  return app;
}