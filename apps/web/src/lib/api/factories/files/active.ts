import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest
} from '@/lib/services/helpers';
import { z } from 'zod';

type ActiveParams = {
  params: { id?: string; fileName: string };
  workspaceScoped: boolean;
};

// Schema for setting file active state
const setActiveSchema = z.object({
  active: z.boolean()
});

/**
 * Set a file's active state
 */
export async function setFileActive(
  req: NextRequest,
  { params, workspaceScoped }: ActiveParams
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
    
    // Parse and validate request body
    const body = await req.json();
    let validatedData;
    
    try {
      validatedData = setActiveSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiError(
          `Invalid request data: ${error.errors.map(e => e.message).join(', ')}`,
          ErrorCode.BAD_REQUEST,
          400,
          error
        );
      }
      throw error;
    }
    
    try {
      // Set file active state
      await workspace.files.setActive(params.fileName, validatedData.active);
      
      // Get the updated file to return
      const file = await workspace.files.get(params.fileName);
      return createApiResponse(file);
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
        `Failed to set file active state: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
