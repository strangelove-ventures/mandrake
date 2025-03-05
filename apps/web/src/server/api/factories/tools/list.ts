import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/server/services/helpers';

type ListParams = {
  params?: { id?: string, setId?: string };
  workspaceScoped: boolean;
};

/**
 * List all tool config sets
 */
export async function listConfigSets(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    // List all config sets
    const configSets = await toolsManager.listConfigSets();
    
    // Return the array of config sets directly
    return createApiResponse(configSets);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to list tool config sets: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Get a specific tool config set
 */
export async function getConfigSet(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    if (!params?.setId) {
      throw new ApiError(
        'Config set ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    try {
      // Get specific config set
      const configSet = await toolsManager.getConfigSet(params.setId);
      return createApiResponse(configSet);
    } catch (error) {
      // Convert not found error to API error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ApiError(
          `Config set not found: ${params.setId}`,
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
        `Failed to get config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
