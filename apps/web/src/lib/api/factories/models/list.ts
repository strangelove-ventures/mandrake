// lib/api/factories/models/list.ts
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import {
  getWorkspaceManagerForRequest,
  getMandrakeManagerForRequest
} from '@/lib/services/helpers';

type ListParams = {
  params?: { id?: string, modelId?: string };
  workspaceScoped: boolean;
};

/**
 * List all models
 */
export async function listModels(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
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

    // List all models
    const models = await modelsManager.listModels();
    return createApiResponse(models);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to list models: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Get a specific model
 */
export async function getModel(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
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

    if (!params?.modelId) {
      throw new ApiError(
        'Model ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }

    try {
      // Get specific model
      const model = await modelsManager.getModel(params.modelId);
      return createApiResponse(model);
    } catch (error) {
      // Convert model not found error to API error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ApiError(
          `Model not found: ${params.modelId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          error
        );
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to get model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}