// lib/api/factories/models/delete.ts
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import {
  getWorkspaceManagerForRequest,
  getMandrakeManagerForRequest
} from '@/lib/services/helpers';

type DeleteParams = {
  params: { id?: string; modelId: string };
  workspaceScoped: boolean;
};

/**
 * Delete a model
 */
export async function deleteModel(
  req: NextRequest,
  { params, workspaceScoped }: DeleteParams
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

    try {
      // Delete the model
      await modelsManager.removeModel(params.modelId);
      return createApiResponse({ success: true });
    } catch (error) {
      // Handle specific errors
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
        `Failed to delete model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}