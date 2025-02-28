import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createNoContentResponse } from '../../utils/response';
import { getWorkspaceManagerForRequest } from '@/lib/services/helpers';

type DeleteParams = {
  params: { id?: string, contextId: string };
  workspaceScoped: boolean;
};

/**
 * Delete a dynamic context
 */
export async function deleteContext(
  req: NextRequest,
  { params, workspaceScoped }: DeleteParams
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
    
    try {
      await dynamicManager.delete(params.contextId);
    } catch (error) {
      // If the context doesn't exist, that's ok for DELETE (idempotent)
      if (error instanceof Error && error.message?.includes('not found')) {
        console.log(`Context ${params.contextId} already deleted or does not exist`);
      } else {
        throw error;
      }
    }
    return createNoContentResponse();
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to delete dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
