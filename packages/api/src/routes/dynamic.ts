import { Hono } from 'hono';
import { DynamicContextManager } from '@mandrake/workspace';

/**
 * Create reusable routes for dynamic context management
 * These routes handle dynamic context configurations within a workspace
 */
export function dynamicContextRoutes(dynamicContextManager: DynamicContextManager) {
  const app = new Hono();
  
  // List all dynamic context methods
  app.get('/', async (c) => {
    try {
      const methods = await dynamicContextManager.list();
      return c.json(methods);
    } catch (error) {
      console.error('Error listing dynamic context methods:', error);
      return c.json({ error: 'Failed to list dynamic context methods' }, 500);
    }
  });
  
  // Get a specific dynamic context method
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const method = await dynamicContextManager.get(id);
      if (!method) {
        return c.json({ error: 'Dynamic context method not found' }, 404);
      }
      return c.json(method);
    } catch (error) {
      console.error(`Error getting dynamic context method ${id}:`, error);
      return c.json({ error: `Failed to get dynamic context method ${id}` }, 500);
    }
  });
  
  // Create a new dynamic context method
  app.post('/', async (c) => {
    try {
      const config = await c.req.json();
      await dynamicContextManager.create(config);
      return c.json({ success: true, id: config.id }, 201);
    } catch (error) {
      console.error('Error creating dynamic context method:', error);
      return c.json({ error: 'Failed to create dynamic context method' }, 500);
    }
  });
  
  // Update an existing dynamic context method
  app.put('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const updates = await c.req.json();
      await dynamicContextManager.update(id, updates);
      return c.json({ success: true, id });
    } catch (error) {
      console.error(`Error updating dynamic context method ${id}:`, error);
      return c.json({ error: `Failed to update dynamic context method ${id}` }, 500);
    }
  });
  
  // Delete a dynamic context method
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      await dynamicContextManager.delete(id);
      return c.json({ success: true, id });
    } catch (error) {
      console.error(`Error deleting dynamic context method ${id}:`, error);
      return c.json({ error: `Failed to delete dynamic context method ${id}` }, 500);
    }
  });
  
  return app;
}