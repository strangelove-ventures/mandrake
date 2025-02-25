import { NextRequest, NextResponse } from 'next/server';
import { ModelsHandler } from '../handlers/ModelsHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getWorkspaceManager } from '../utils/workspace';
import { validateParams, validateQuery } from '../middleware/validation';
import { z } from 'zod';

// Parameter schemas
const modelIdSchema = z.object({
  modelId: z.string().min(1, "Model ID is required")
});

const providerIdSchema = z.object({
  providerId: z.string().min(1, "Provider ID is required")
});

const activeModelSchema = z.object({
  active: z.enum(['true', 'false']).optional()
});

/**
 * Creates route handlers for models endpoints
 * @param isWorkspaceScope Whether these routes are for workspace-specific models
 * @returns Route handler methods
 */
export function createModelRoutes(isWorkspaceScope: boolean = false) {
  return {
    // GET handler for listing models, providers, or getting a specific model/provider
    async GET(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ModelsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ModelsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ModelsHandler();
        }
        
        // Check if we're requesting active model
        const activeQuery = validateQuery(req, activeModelSchema);
        if (activeQuery.active === 'true') {
          const activeModelId = await handler.getActiveModel();
          return createApiResponse({ activeModelId });
        }
        
        // Handle specific model request if modelId is provided
        if (params?.modelId) {
          const { modelId } = validateParams(params, modelIdSchema);
          return createApiResponse(await handler.getModelDetails(modelId));
        }
        
        // Handle specific provider request if providerId is provided  
        if (params?.providerId) {
          const { providerId } = validateParams(params, providerIdSchema);
          return createApiResponse(await handler.getProviderDetails(providerId));
        }
        
        // Otherwise list all models or providers based on path
        const url = new URL(req.url);
        if (url.pathname.includes('/providers')) {
          return createApiResponse(await handler.listProviders());
        }
        
        // Default to listing all models
        return createApiResponse(await handler.listModels());
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // POST handler for creating a new model/provider or setting active model
    async POST(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ModelsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ModelsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ModelsHandler();
        }
        
        // Handle setting active model
        const url = new URL(req.url);
        if (url.pathname.includes('/active')) {
          const data = await req.json();
          await handler.setActiveModel(data.modelId);
          return createApiResponse({ success: true });
        }
        
        // Handle provider creation
        if (url.pathname.includes('/providers')) {
          const providerId = params?.providerId as string;
          if (!providerId) {
            throw new Error('Provider ID is required');
          }
          
          await handler.addProvider(providerId, req);
          
          if (workspaceId) {
            const workspaceManager = await getWorkspaceManager(workspaceId);
            const provider = await workspaceManager.models.getProvider(providerId);
            return createApiResponse(provider, 201);
          }
          
          return createApiResponse({ id: providerId }, 201);
        }
        
        // Handle model creation (default)
        const modelId = params?.modelId as string;
        if (!modelId) {
          throw new Error('Model ID is required');
        }
        
        await handler.addModel(modelId, req);
        
        if (workspaceId) {
          const workspaceManager = await getWorkspaceManager(workspaceId);
          const model = await workspaceManager.models.getModel(modelId);
          return createApiResponse(model, 201);
        }
        
        return createApiResponse({ id: modelId }, 201);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT handler for updating a model/provider
    async PUT(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ModelsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ModelsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ModelsHandler();
        }
        
        // Handle provider update
        const url = new URL(req.url);
        if (url.pathname.includes('/providers')) {
          // Validate that we have a provider ID
          const { providerId } = validateParams(params || {}, providerIdSchema);
          
          // Update the provider
          await handler.updateProvider(providerId, req);
          
          // Fetch and return the updated provider
          if (workspaceId) {
            const workspaceManager = await getWorkspaceManager(workspaceId);
            const provider = await workspaceManager.models.getProvider(providerId);
            return createApiResponse(provider);
          }
          
          return createApiResponse({ success: true });
        }
        
        // Handle model update (default)
        // Validate that we have a model ID
        const { modelId } = validateParams(params || {}, modelIdSchema);
        
        // Update the model
        await handler.updateModel(modelId, req);
        
        // Fetch and return the updated model
        if (workspaceId) {
          const workspaceManager = await getWorkspaceManager(workspaceId);
          const model = await workspaceManager.models.getModel(modelId);
          return createApiResponse(model);
        }
        
        return createApiResponse({ success: true });
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // DELETE handler for removing a model/provider
    async DELETE(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ModelsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ModelsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ModelsHandler();
        }
        
        // Handle provider deletion
        const url = new URL(req.url);
        if (url.pathname.includes('/providers')) {
          // Validate that we have a provider ID
          const { providerId } = validateParams(params || {}, providerIdSchema);
          
          // Remove the provider
          await handler.removeProvider(providerId);
          return createNoContentResponse();
        }
        
        // Handle model deletion (default)
        // Validate that we have a model ID
        const { modelId } = validateParams(params || {}, modelIdSchema);
        
        // Remove the model
        await handler.removeModel(modelId);
        return createNoContentResponse();
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}