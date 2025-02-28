import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest
} from '@/lib/services/helpers';

type DeleteParams = {
  params: { id?: string; fileName: string };
  workspaceScoped: boolean;
};

/**
 * Delete a file
 */
export async function deleteFile(
  req: NextRequest,
  { params, workspaceScoped }: DeleteParams
) {
  try {
    // Files are only available at workspace level
    if (!workspaceScoped) {
      throw new ApiError(
        'System-level files are not supported',
        ErrorCode.NOT_IMPLEMENTED,
        501
      );
    }
    
    if (!params?.id) {
      throw new ApiError(
        'Workspace ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    const workspace = await getWorkspaceManagerForRequest(params.id);
    
    try {
      // Delete the file
      await workspace.files.delete(params.fileName);
      
      // Return success with 204 No Content status
      return new Response(null, { status: 204 });
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ApiError(
          `File not found: ${params.fileName}`,
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
        `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
