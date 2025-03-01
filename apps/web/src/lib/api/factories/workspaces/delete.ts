import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { getMandrakeManagerForRequest } from '@/lib/services/helpers';

/**
 * Delete a workspace
 */
export async function deleteWorkspace(
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
      
      // Check if workspace exists
      const workspaceInfo = await mandrakeManager.config.findWorkspaceById(params.id);
      
      if (!workspaceInfo) {
        throw new ApiError(
          `Workspace not found: ${params.id}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404
        );
      }
      
      // Delete the workspace
      await mandrakeManager.deleteWorkspace(params.id);
      
      // Return success with no content
      return new Response(null, { status: 204 });
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
        `Failed to delete workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
