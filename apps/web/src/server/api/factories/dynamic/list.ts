import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/server/services/helpers';

type ListParams = {
  params?: { id?: string, contextId?: string };
  workspaceScoped: boolean;
};

/**
 * List all dynamic contexts
 */
export async function listContexts(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
) {
  try {
    let dynamicManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      dynamicManager = workspace.dynamic;
    } else {
      // System doesn't have dynamic contexts in the current implementation
      throw new ApiError(
        'System-level dynamic contexts are not yet supported',
        ErrorCode.NOT_IMPLEMENTED,
        501
      );
    }
    
    // List all contexts
    const contexts = await dynamicManager.list();
    return createApiResponse(contexts);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to list dynamic contexts: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Get a specific dynamic context
 */
export async function getContext(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
) {
  try {
    let dynamicManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      dynamicManager = workspace.dynamic;
    } else {
      // System doesn't have dynamic contexts
      throw new ApiError(
        'System-level dynamic contexts are not yet supported',
        ErrorCode.NOT_IMPLEMENTED,
        501
      );
    }
    
    if (!params?.contextId) {
      throw new ApiError(
        'Context ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    // Get specific context
    const context = await dynamicManager.get(params.contextId);
    if (!context) {
      throw new ApiError(
        `Dynamic context not found: ${params.contextId}`,
        ErrorCode.RESOURCE_NOT_FOUND,
        404
      );
    }
    
    return createApiResponse(context);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to get dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
