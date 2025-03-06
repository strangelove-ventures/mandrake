import { Hono } from 'hono';
import { FilesManager } from '@mandrake/workspace';

/**
 * Create reusable routes for files management
 * These routes handle file operations within a workspace
 */
export function filesRoutes(filesManager: FilesManager) {
  const app = new Hono();
  
  // List all files (optionally filtered by active status)
  app.get('/', async (c) => {
    const activeParam = c.req.query('active');
    const active = activeParam === undefined ? true : activeParam === 'true';
    
    try {
      const files = await filesManager.list(active);
      return c.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      return c.json({ error: 'Failed to list files' }, 500);
    }
  });
  
  // Get a specific file
  app.get('/:fileName', async (c) => {
    const fileName = c.req.param('fileName');
    
    try {
      const file = await filesManager.get(fileName);
      if (!file) {
        return c.json({ error: 'File not found' }, 404);
      }
      return c.json(file);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'File not found' }, 404);
      }
      console.error(`Error getting file ${fileName}:`, error);
      return c.json({ error: `Failed to get file ${fileName}` }, 500);
    }
  });
  
  // Create a new file
  app.post('/', async (c) => {
    try {
      const { name, content, active = true } = await c.req.json();
      if (!name) {
        return c.json({ error: 'File name is required' }, 400);
      }
      
      await filesManager.create(name, content || '', active);
      return c.json({ success: true, name }, 201);
    } catch (error) {
      console.error('Error creating file:', error);
      return c.json({ error: 'Failed to create file' }, 500);
    }
  });
  
  // Update an existing file (content and/or active status)
  app.put('/:fileName', async (c) => {
    const fileName = c.req.param('fileName');
    
    try {
      const updates = await c.req.json();
      
      // Update file content if provided
      if (updates.content !== undefined) {
        await filesManager.update(fileName, updates.content);
      }
      
      // Update active status if provided
      if (updates.active !== undefined) {
        await filesManager.setActive(fileName, updates.active);
      }
      
      return c.json({ success: true, name: fileName });
    } catch (error) {
      console.error(`Error updating file ${fileName}:`, error);
      return c.json({ error: `Failed to update file ${fileName}` }, 500);
    }
  });
  
  // Delete a file
  app.delete('/:fileName', async (c) => {
    const fileName = c.req.param('fileName');
    
    try {
      await filesManager.delete(fileName);
      return c.json({ success: true, name: fileName });
    } catch (error) {
      console.error(`Error deleting file ${fileName}:`, error);
      return c.json({ error: `Failed to delete file ${fileName}` }, 500);
    }
  });
  
  return app;
}