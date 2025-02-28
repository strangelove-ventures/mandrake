import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/lib/services/helpers';

type DeleteParams = {
  params: { id?: string; setId: string };
  workspaceScoped: boolean;
};

/**
 * Delete a config set
 */
export async function deleteConfigSet(
  req: NextRequest,
  { params, workspaceScoped }: DeleteParams
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
    
    try {
      // Delete the config set
      await toolsManager.removeConfigSet(params.setId);
      
      // Return success with 204 No Content status
      return new Response(null, { status: 204 });
    } catch (error) {
      // Handle specific errors
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
        `Failed to delete config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
