// lib/api/factories/models/active.ts
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import {
  getWorkspaceManagerForRequest,
  getMandrakeManagerForRequest
} from '@/lib/services/helpers';
import { z } from 'zod';

type ActiveParams = {
  params?: { id?: string };
  workspaceScoped: boolean;
};

// Schema for setting active model
const setActiveSchema = z.object({
  id: z.string().min(1)
});

/**
 * Get the active model
 */
export async function getActiveModel(
  req: NextRequest,
  { params, workspaceScoped }: ActiveParams
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
      // Get active model ID
      const activeId = await modelsManager.getActive();

      if (!activeId) {
        return createApiResponse({ active: null });
      }

      // Get the active model details
      const activeModel = await modelsManager.getModel(activeId);
      return createApiResponse({
        active: activeId,
        model: activeModel
      });
    } catch (error) {
      // If the active model no longer exists, return null
      if (error instanceof Error && error.message.includes('not found')) {
        return createApiResponse({ active: null });
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to get active model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Set the active model
 */
export async function setActiveModel(
  req: NextRequest,
  { params, workspaceScoped }: ActiveParams
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
    let validatedData;

    try {
      validatedData = setActiveSchema.parse(body);
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
      // Set active model
      await modelsManager.setActive(validatedData.id);

      // Get the model to confirm it exists and to return details
      const model = await modelsManager.getModel(validatedData.id);

      return createApiResponse({
        active: validatedData.id,
        model
      });
    } catch (error) {
      // Handle the case where the model doesn't exist
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ApiError(
          `Model not found: ${validatedData.id}`,
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
        `Failed to set active model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}