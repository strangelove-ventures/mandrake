import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest
} from '@/lib/services/helpers';

type ListParams = {
  params?: { id?: string, fileName?: string };
  workspaceScoped: boolean;
};

/**
 * List all files
 */
export async function listFiles(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
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
    
    // Get active query parameter
    const url = new URL(req.url);
    const activeParam = url.searchParams.get('active');
    const active = activeParam ? activeParam === 'true' : true;
    
    // List all files
    const files = await workspace.files.list(active);
    return createApiResponse(files);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Get a specific file
 */
export async function getFile(
  req: NextRequest,
  { params, workspaceScoped }: ListParams
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
    
    if (!params?.fileName) {
      throw new ApiError(
        'File name is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    const workspace = await getWorkspaceManagerForRequest(params.id);
    
    try {
      // Get specific file
      const file = await workspace.files.get(params.fileName);
      return createApiResponse(file);
    } catch (error) {
      // Convert file not found error to API error
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
        `Failed to get file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
