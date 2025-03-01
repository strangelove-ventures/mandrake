import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getMandrakeManagerForRequest } from '@/lib/services/helpers';

/**
 * List all workspaces
 */
export async function listWorkspaces(req: NextRequest) {
  try {
    const mandrakeManager = await getMandrakeManagerForRequest();
    
    // List all workspaces
    const workspaces = await mandrakeManager.listWorkspaces();
    
    return createApiResponse(workspaces);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to list workspaces: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Get details of a specific workspace
 */
export async function getWorkspaceDetails(
  req: NextRequest,
  params: { id: string }
) {
  try {
    if (!params.id) {
      throw new ApiError(
        'Workspace ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    try {
      const mandrakeManager = await getMandrakeManagerForRequest();
      
      // Get workspace from registry first to get basic details
      const workspaceInfo = await mandrakeManager.config.findWorkspaceById(params.id);
      
      if (!workspaceInfo) {
        throw new ApiError(
          `Workspace not found: ${params.id}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404
        );
      }
      
      // Get full workspace to verify it exists and is accessible
      const workspace = await mandrakeManager.getWorkspace(params.id);
      
      // Get workspace config for additional details
      const config = await workspace.config.getConfig();
      
      // Combine workspace info with config
      const workspaceDetails = {
        ...workspaceInfo,
        ...config,
      };
      
      return createApiResponse(workspaceDetails);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new ApiError(
            `Workspace not found: ${params.id}`,
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
        `Failed to get workspace details: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
