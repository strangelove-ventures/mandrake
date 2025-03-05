'use server';

import { NextRequest } from 'next/server';
import { createApiResponse } from '@/server/api/utils/response';
import { validateRequestBody } from '@/server/api/middleware/validation';
import { getModelsManager, handleModelError, validateParams } from './utils';
import { z } from 'zod';
import { ModelConfig, ProviderConfig } from '@mandrake/utils';

// Validation schema for creating a model
const createModelSchema = z.object({
  id: z.string().min(1, "Model ID is required"),
  config: z.object({
    enabled: z.boolean().optional(),
    providerId: z.string().min(1, "Provider ID is required"),
    modelId: z.string().min(1, "Model ID is required"),
    config: z.object({
      temperature: z.number().optional(),
      maxTokens: z.number().optional()
    }).optional()
  })
});

// Validation schema for creating a provider
const createProviderSchema = z.object({
  id: z.string().min(1, "Provider ID is required"),
  config: z.object({
    type: z.string().min(1, "Provider type is required"),
    apiKey: z.string().optional(),
    apiEndpoint: z.string().optional()
  })
});

/**
 * Create a new model
 */
export async function createModel(
  req: NextRequest,
  { params, workspaceScoped = false }: { params?: { id?: string }; workspaceScoped?: boolean }
) {
  try {
    // Validate parameters
    validateParams(params, workspaceScoped);
    
    // Get the appropriate models manager
    const modelsManager = await getModelsManager(params?.id, workspaceScoped);
    
    // Validate and parse request body
    const { id, config } = await validateRequestBody(req, createModelSchema);
    
    // Create the model
    await modelsManager.addModel(id, config as ModelConfig);
    
    // Get the created model
    const model = await modelsManager.getModel(id);
    
    return createApiResponse(model, 201);
  } catch (error) {
    return handleModelError(error, 'create model');
  }
}

/**
 * Create a new provider
 */
export async function createProvider(
  req: NextRequest,
  { params, workspaceScoped = false }: { params?: { id?: string }; workspaceScoped?: boolean }
) {
  try {
    // Validate parameters
    validateParams(params, workspaceScoped);
    
    // Get the appropriate models manager
    const modelsManager = await getModelsManager(params?.id, workspaceScoped);
    
    // Validate and parse request body
    const { id, config } = await validateRequestBody(req, createProviderSchema);
    
    // Create the provider
    await modelsManager.addProvider(id, config as ProviderConfig);
    
    // Get the created provider
    const provider = await modelsManager.getProvider(id);
    
    return createApiResponse(provider, 201);
  } catch (error) {
    return handleModelError(error, 'create provider');
  }
}
