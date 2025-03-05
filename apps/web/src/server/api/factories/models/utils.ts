'use server';

import { NextRequest } from 'next/server';
import { getManagerFromMandrake, getManagerForWorkspace, ModelsManager } from '@/server/services/helpers';
import { ApiError, ErrorCode } from '@/server/api/middleware/errorHandling';

/**
 * Get the appropriate models manager based on whether operation is workspace-scoped
 * @param workspaceId Optional workspace ID for workspace-scoped operations
 * @param workspaceScoped Whether the operation is workspace-scoped
 * @returns ModelsManager instance for either system or workspace
 */
export async function getModelsManager(workspaceId?: string, workspaceScoped = false): Promise<ModelsManager> {
  // For workspace-scoped operations, ensure workspace ID is provided
  if (workspaceScoped && !workspaceId) {
    throw new ApiError(
      'Workspace ID is required for workspace-scoped operations',
      ErrorCode.BAD_REQUEST,
      400
    );
  }

  // Get appropriate models manager
  if (workspaceScoped) {
    return await getManagerForWorkspace(workspaceId!, 'models') as ModelsManager;
  } else {
    return await getManagerFromMandrake('models') as ModelsManager;
  }
}

/**
 * Validate parameters for API routes
 * @param params Request parameters
 * @param workspaceScoped Whether the operation is workspace-scoped
 */
export function validateParams(
  params?: { id?: string; modelId?: string }, 
  workspaceScoped = false
): void {
  // For workspace-scoped operations, ensure workspace ID is provided
  if (workspaceScoped && !params?.id) {
    throw new ApiError(
      'Workspace ID is required for workspace-scoped operations',
      ErrorCode.BAD_REQUEST,
      400
    );
  }
}

/**
 * Default error handler for model operations
 * @param error The error to handle
 * @param operation The operation that was being performed
 */
export function handleModelError(error: unknown, operation: string): never {
  console.error(`Error ${operation}:`, error);

  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof Error && error.message.includes('not found')) {
    throw new ApiError(
      error.message,
      ErrorCode.RESOURCE_NOT_FOUND,
      404,
      error
    );
  }

  throw new ApiError(
    `Failed to ${operation}: ${error instanceof Error ? error.message : String(error)}`,
    ErrorCode.INTERNAL_ERROR,
    500,
    error instanceof Error ? error : undefined
  );
}
