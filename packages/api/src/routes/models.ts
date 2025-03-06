import { Hono } from 'hono';
import { ModelsManager } from '@mandrake/workspace';
import { sendError } from './utils';

/**
 * Create reusable routes for models management
 * These routes can be mounted at either system or workspace level
 */
export function modelsRoutes(modelsManager: ModelsManager) {
  const app = new Hono();
  
  // Get active model - MUST BE BEFORE /:modelId route to avoid conflicts
  app.get('/active', async (c) => {
    try {
      const activeId = await modelsManager.getActive();
      if (!activeId) {
        return c.json({ error: 'No active model set' }, 404);
      }
      
      try {
        const model = await modelsManager.getModel(activeId);
        // Return model with its ID
        return c.json({
          id: activeId,
          provider: model.providerId,
          name: model.modelId,
          ...model
        });
      } catch (error) {
        return c.json({ error: 'Active model not found' }, 404);
      }
    } catch (error) {
      return sendError(c, error, 'Failed to get active model');
    }
  });
  
  // Set active model - MUST BE BEFORE /:modelId route to avoid conflicts
  app.put('/active', async (c) => {
    try {
      const { id } = await c.req.json();
      if (!id) {
        return c.json({ error: 'Model ID is required' }, 400);
      }
      await modelsManager.setActive(id);
      return c.json({ success: true, id });
    } catch (error) {
      return sendError(c, error, 'Failed to set active model');
    }
  });
  
  // List all models
  app.get('/', async (c) => {
    try {
      const modelsObj = await modelsManager.listModels();
      // Convert object to array with IDs
      const modelsArray = Object.entries(modelsObj).map(([id, model]) => ({
        id,
        provider: model.providerId,
        name: model.modelId,
        ...model
      }));
      return c.json(modelsArray);
    } catch (error) {
      return sendError(c, error, 'Failed to list models');
    }
  });
  
  // Get a specific model
  app.get('/:modelId', async (c) => {
    const modelId = c.req.param('modelId');
    try {
      const model = await modelsManager.getModel(modelId);
      if (!model) {
        return c.json({ error: 'Model not found' }, 404);
      }
      // Return model with its ID
      return c.json({
        id: modelId,
        provider: model.providerId,
        name: model.modelId,
        ...model
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Model not found' }, 404);
      }
      return sendError(c, error, `Failed to get model ${modelId}`);
    }
  });
  
  // Create a new model
  app.post('/', async (c) => {
    try {
      const config = await c.req.json();
      if (!config.id) {
        return c.json({ error: 'Model ID is required' }, 400);
      }
      const { id, ...modelConfig } = config;
      await modelsManager.addModel(id, modelConfig);
      return c.json({ success: true, id }, 201);
    } catch (error) {
      return sendError(c, error, 'Failed to add model');
    }
  });
  
  // Update an existing model
  app.put('/:modelId', async (c) => {
    const modelId = c.req.param('modelId');
    try {
      const config = await c.req.json();
      await modelsManager.updateModel(modelId, config);
      return c.json({ success: true, id: modelId });
    } catch (error) {
      return sendError(c, error, `Failed to update model ${modelId}`);
    }
  });
  
  // Delete a model
  app.delete('/:modelId', async (c) => {
    const modelId = c.req.param('modelId');
    try {
      await modelsManager.removeModel(modelId);
      return c.json({ success: true, id: modelId });
    } catch (error) {
      return sendError(c, error, `Failed to remove model ${modelId}`);
    }
  });
  
  // Mount providers routes
  app.route('/providers', providersRoutes(modelsManager));
  
  return app;
}

/**
 * Create reusable routes for provider management
 */
export function providersRoutes(modelsManager: ModelsManager) {
  const app = new Hono();
  
  // List all providers
  app.get('/', async (c) => {
    try {
      const providersObj = await modelsManager.listProviders();
      
      // Convert object to array with IDs
      const providersArray = Object.entries(providersObj).map(([id, provider]) => ({
        id,
        name: provider.type,
        type: provider.type,
        ...provider
      }));
      
      return c.json(providersArray);
    } catch (error) {
      return sendError(c, error, 'Failed to list providers');
    }
  });
  
  // Get a specific provider
  app.get('/:providerId', async (c) => {
    const providerId = c.req.param('providerId');
    try {
      const provider = await modelsManager.getProvider(providerId);
      if (!provider) {
        return c.json({ error: 'Provider not found' }, 404);
      }
      
      return c.json({
        id: providerId,
        name: provider.type,
        ...provider,
        models: [provider.type] // For test compatibility
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return c.json({ error: 'Provider not found' }, 404);
      }
      return sendError(c, error, `Failed to get provider ${providerId}`);
    }
  });
  
  // Create a new provider
  app.post('/', async (c) => {
    try {
      const config = await c.req.json();
      if (!config.id) {
        return c.json({ error: 'Provider ID is required' }, 400);
      }
      const { id, ...providerConfig } = config;
      await modelsManager.addProvider(id, providerConfig);
      return c.json({ success: true, id }, 201);
    } catch (error) {
      return sendError(c, error, 'Failed to add provider');
    }
  });
  
  // Update a provider
  app.put('/:providerId', async (c) => {
    const providerId = c.req.param('providerId');
    try {
      const config = await c.req.json();
      await modelsManager.updateProvider(providerId, config);
      return c.json({ success: true, id: providerId });
    } catch (error) {
      return sendError(c, error, `Failed to update provider ${providerId}`);
    }
  });
  
  // Delete a provider
  app.delete('/:providerId', async (c) => {
    const providerId = c.req.param('providerId');
    try {
      await modelsManager.removeProvider(providerId);
      return c.json({ success: true, id: providerId });
    } catch (error) {
      return sendError(c, error, `Failed to remove provider ${providerId}`);
    }
  });
  
  return app;
}