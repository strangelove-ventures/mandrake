'use server';

import { NextRequest } from 'next/server';
import { createApiResponse } from '@/server/api/utils/response';
import { getModelsManager, handleModelError, validateParams } from './utils';
import { ApiError, ErrorCode } from '@/server/api/middleware/errorHandling';

/**
 * Delete a model
 */
export async function deleteModel(
  req: NextRequest,
  { params, workspaceScoped = false }: { params: { modelId: string; id?: string }; workspaceScoped?: boolean }
) {
  try {
    // Validate parameters
    validateParams(params, workspaceScoped);
    
    if (!params.modelId) {
      throw new ApiError(
        'Model ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    // Get the appropriate models manager
    const modelsManager = await getModelsManager(params.id, workspaceScoped);
    
    // Check if model exists
    await modelsManager.getModel(params.modelId);
    
    // Check if model is currently active
    const activeModelId = await modelsManager.getActive();
    if (activeModelId === params.modelId) {
      throw new ApiError(
        `Cannot delete active model. Set another model as active first.`,
        ErrorCode.RESOURCE_CONFLICT,
        409
      );
    }
    
    // Delete the model
    await modelsManager.removeModel(params.modelId);
    
    return createApiResponse({ success: true });
  } catch (error) {
    return handleModelError(error, `delete model ${params.modelId}`);
  }
}

/**
 * Delete a provider
 */
export async function deleteProvider(
  req: NextRequest,
  { params, workspaceScoped = false }: { params: { providerId: string; id?: string }; workspaceScoped?: boolean }
) {
  try {
    // Validate parameters
    validateParams(params, workspaceScoped);
    
    if (!params.providerId) {
      throw new ApiError(
        'Provider ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    // Get the appropriate models manager
    const modelsManager = await getModelsManager(params.id, workspaceScoped);
    
    // Check if provider exists
    await modelsManager.getProvider(params.providerId);
    
    // Delete the provider (this will also delete any models using this provider)
    await modelsManager.removeProvider(params.providerId);
    
    return createApiResponse({ success: true });
  } catch (error) {
    return handleModelError(error, `delete provider ${params.providerId}`);
  }
}
