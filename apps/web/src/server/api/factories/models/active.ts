'use server';

import { NextRequest } from 'next/server';
import { createApiResponse } from '@/server/api/utils/response';
import { validateRequestBody } from '@/server/api/middleware/validation';
import { getModelsManager, handleModelError } from './utils';
import { z } from 'zod';

// Validation schema for setting active model
const activeModelSchema = z.object({
  id: z.string().min(1, "Model ID is required")
});

/**
 * Get the active model
 */
export async function getActiveModel(
  req: NextRequest,
  { params, workspaceScoped = false }: { params?: { id?: string }; workspaceScoped?: boolean }
) {
  try {
    const modelsManager = await getModelsManager(params?.id, workspaceScoped);
    const activeModelId = await modelsManager.getActive();
    if (!activeModelId) {
      return createApiResponse(null);
    }
    
    try {
      const activeModel = await modelsManager.getModel(activeModelId);
      return createApiResponse({ active: activeModelId, model: activeModel });
    } catch (error) {
      return createApiResponse({ active: activeModelId });
    }
  } catch (error) {
    return handleModelError(error, 'get active model');
  }
}

/**
 * Set the active model
 */
export async function setActiveModel(
  req: NextRequest,
  { params, workspaceScoped = false }: { params?: { id?: string }; workspaceScoped?: boolean }
) {
  try {
    const modelsManager = await getModelsManager(params?.id, workspaceScoped);
    const body = await validateRequestBody(req, activeModelSchema);

    const exists = await modelsManager.getModel(body.id);
    if (!exists) {
      throw handleModelError('Model not found', 'set active model');
    }
    await modelsManager.setActive(body.id);
    return createApiResponse({ active: body.id });
  } catch (error) {
    return handleModelError(error, 'set active model');
  }
}
