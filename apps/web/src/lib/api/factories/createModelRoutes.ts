import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getMandrakeManager, getWorkspaceManagerById } from '../utils/workspace';

// Validation schemas
const modelSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  name: z.string().optional(),
  active: z.boolean().optional()
});

const modelUpdateSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  name: z.string().optional(),
  active: z.boolean().optional()
});

/**
 * Creates handlers for model routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createModelRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List models or get a specific model
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, modelId?: string } } = {}
    ) {
      try {
        let modelsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          modelsManager = workspace.models;
        } else {
          const mandrakeManager = getMandrakeManager();
          modelsManager = mandrakeManager.models;
        }
        
        if (params?.modelId) {
          // Get specific model
          const model = await modelsManager.get(params.modelId);
          if (!model) {
            throw new ApiError(
              `Model not found: ${params.modelId}`,
              ErrorCode.RESOURCE_NOT_FOUND,
              404
            );
          }
          return createApiResponse(model);
        } else {
          // List all models
          const models = await modelsManager.list();
          return createApiResponse(models);
        }
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to get models: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * POST - Create a new model
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      try {
        let modelsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          modelsManager = workspace.models;
        } else {
          const mandrakeManager = getMandrakeManager();
          modelsManager = mandrakeManager.models;
        }
        
        const body = await validateBody(req, modelSchema);
        
        // If model is set as active, make other models inactive
        if (body.active) {
          const existingModels = await modelsManager.list();
          for (const existing of existingModels) {
            if (existing.active) {
              await modelsManager.update(existing.id, { ...existing, active: false });
            }
          }
        }
        
        const result = await modelsManager.create(body);
        return createApiResponse(result, 201);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to create model: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * PUT - Update a model
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, modelId: string } }
    ) {
      try {
        let modelsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          modelsManager = workspace.models;
        } else {
          const mandrakeManager = getMandrakeManager();
          modelsManager = mandrakeManager.models;
        }
        
        const body = await validateBody(req, modelUpdateSchema);
        
        // Get existing model
        const existing = await modelsManager.get(params.modelId);
        if (!existing) {
          throw new ApiError(
            `Model not found: ${params.modelId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        // If setting this model as active, make other models inactive
        if (body.active && !existing.active) {
          const existingModels = await modelsManager.list();
          for (const model of existingModels) {
            if (model.id !== params.modelId && model.active) {
              await modelsManager.update(model.id, { ...model, active: false });
            }
          }
        }
        
        // Update model
        const updated = {
          ...existing,
          ...body
        };
        
        const result = await modelsManager.update(params.modelId, updated);
        return createApiResponse(result);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to update model: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * DELETE - Remove a model
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, modelId: string } }
    ) {
      try {
        let modelsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          modelsManager = workspace.models;
        } else {
          const mandrakeManager = getMandrakeManager();
          modelsManager = mandrakeManager.models;
        }
        
        await modelsManager.delete(params.modelId);
        return createNoContentResponse();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to delete model: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
  };
}
