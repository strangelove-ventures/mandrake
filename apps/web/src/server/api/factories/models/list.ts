'use server';

import { NextRequest } from 'next/server';
import { createApiResponse } from '@/server/api/utils/response';
import { getModelsManager, handleModelError, validateParams } from './utils';
import { ApiError, ErrorCode } from '@/server/api/middleware/errorHandling';

/**
 * List all models (system or workspace-specific)
 */
export async function listModels(
  req: NextRequest,
  { params, workspaceScoped = false }: { params?: { id?: string }; workspaceScoped?: boolean }
) {
  try {
    // Validate parameters
    validateParams(params, workspaceScoped);
    
    // Get the appropriate models manager
    const modelsManager = await getModelsManager(params?.id, workspaceScoped);
    
    // Get the list of models
    const models = await modelsManager.listModels();
    
    return createApiResponse(models);
  } catch (error) {
    return handleModelError(error, 'list models');
  }
}

/**
 * Get a specific model
 */
export async function getModel(
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
    
    // Get the specific model
    const model = await modelsManager.getModel(params.modelId);
    
    return createApiResponse(model);
  } catch (error) {
    return handleModelError(error, `get model ${params.modelId}`);
  }
}

/**
 * List all providers (system or workspace-specific)
 */
export async function listProviders(
  req: NextRequest,
  { params, workspaceScoped = false }: { params?: { id?: string }; workspaceScoped?: boolean }
) {
  try {
    // Validate parameters
    validateParams(params, workspaceScoped);
    
    // Get the appropriate models manager
    const modelsManager = await getModelsManager(params?.id, workspaceScoped);
    
    // Get the list of providers
    const providers = await modelsManager.listProviders();
    
    return createApiResponse(providers);
  } catch (error) {
    return handleModelError(error, 'list providers');
  }
}

/**
 * Get a specific provider
 */
export async function getProvider(
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
    
    // Get the specific provider
    const provider = await modelsManager.getProvider(params.providerId);
    
    return createApiResponse(provider);
  } catch (error) {
    return handleModelError(error, `get provider ${params.providerId}`);
  }
}
