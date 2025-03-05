'use server';

import { NextRequest } from 'next/server';
import { createApiResponse } from '@/server/api/utils/response';
import { validateRequestBody } from '@/server/api/middleware/validation';
import { getModelsManager, handleModelError, validateParams } from './utils';
import { ApiError, ErrorCode } from '@/server/api/middleware/errorHandling';
import { z } from 'zod';
import { ModelConfig, ProviderConfig } from '@mandrake/utils';

// Validation schema for updating a model
const updateModelSchema = z.object({
  enabled: z.boolean().optional(),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  config: z.object({
    temperature: z.number().optional(),
    maxTokens: z.number().optional()
  }).optional()
});

// Validation schema for updating a provider
const updateProviderSchema = z.object({
  type: z.string().optional(),
  apiKey: z.string().optional(),
  apiEndpoint: z.string().optional()
});

/**
 * Update an existing model
 */
export async function updateModel(
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
    
    // Validate and parse request body
    const updateData = await validateRequestBody(req, updateModelSchema);
    
    // Update the model
    await modelsManager.updateModel(params.modelId, updateData as Partial<ModelConfig>);
    
    // Get the updated model
    const updatedModel = await modelsManager.getModel(params.modelId);
    
    return createApiResponse(updatedModel);
  } catch (error) {
    return handleModelError(error, `update model ${params.modelId}`);
  }
}

/**
 * Update an existing provider
 */
export async function updateProvider(
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
    
    // Validate and parse request body
    const updateData = await validateRequestBody(req, updateProviderSchema);
    
    // Update the provider
    await modelsManager.updateProvider(params.providerId, updateData as Partial<ProviderConfig>);
    
    // Get the updated provider
    const updatedProvider = await modelsManager.getProvider(params.providerId);
    
    return createApiResponse(updatedProvider);
  } catch (error) {
    return handleModelError(error, `update provider ${params.providerId}`);
  }
}
