// lib/api/factories/models/create.ts
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import {
  getWorkspaceManagerForRequest,
  getMandrakeManagerForRequest
} from '@/lib/services/helpers';
import { z } from 'zod';
import { modelConfigSchema } from '@mandrake/utils';

type CreateParams = {
  params?: { id?: string };
  workspaceScoped: boolean;
};

// Create a schema for model creation payload
const createModelSchema = z.object({
  id: z.string().min(1),
  model: modelConfigSchema
});

/**
 * Create a new model
 */
export async function createModel(
  req: NextRequest,
  { params, workspaceScoped }: CreateParams
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
      validatedData = createModelSchema.parse(body);
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

    const { id, model } = validatedData;

    try {
      // Add new model
      await modelsManager.addModel(id, model);
      return createApiResponse({ id, ...model }, 201);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          throw new ApiError(
            `Model already exists: ${id}`,
            ErrorCode.RESOURCE_CONFLICT,
            409,
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
        `Failed to create model: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}