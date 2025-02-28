// lib/api/factories/models/update.ts
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import {
  getWorkspaceManagerForRequest,
  getMandrakeManagerForRequest
} from '@/lib/services/helpers';
import { z } from 'zod';
import { modelConfigSchema, type ModelConfig } from '@mandrake/utils';

type UpdateParams = {
  params: { id?: string; modelId: string };
  workspaceScoped: boolean;
};

// Create a partial schema for model updates using the modelConfigSchema
const updateModelSchema = modelConfigSchema.partial()

// Define the return type to match what ModelsManager.updateModel expects
type ModelConfigUpdate = Partial<ModelConfig>;

/**
 * Update a model
 */
export async function updateModel(
  req: NextRequest,
  { params, workspaceScoped }: UpdateParams
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
      const workspace = await getWorkspaceManagerForRequest(params.id);
      modelsManager = workspace.models;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      modelsManager = mandrake.models;
    }

    // Parse and validate request body
    const body = await req.json();
    let updates: ModelConfigUpdate;

    try {
      updates = updateModelSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiError(
          `Invalid request data: ${error.errors.map(e => e.message).join(', ')}`,
          ErrorCode.BAD_REQUEST,
          400,
          error
        );
      }
      throw error;
    }

    try {
      // Update the model
      await modelsManager.updateModel(params.modelId, updates);

      // Get the updated model to return
      const updatedModel = await modelsManager.getModel(params.modelId);
      return createApiResponse(updatedModel);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new ApiError(
            `Model not found: ${params.modelId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        if (error.message.includes('Provider') && error.message.includes('not found')) {
          throw new ApiError(
            error.message,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
      }
      throw error;
    }
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
}