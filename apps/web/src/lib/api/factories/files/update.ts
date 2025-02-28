import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest
} from '@/lib/services/helpers';
import { z } from 'zod';

type UpdateParams = {
  params: { id?: string; fileName: string };
  workspaceScoped: boolean;
};

// Create schema for file updates
const updateFileSchema = z.object({
  content: z.string()
});

/**
 * Update a file
 */
export async function updateFile(
  req: NextRequest,
  { params, workspaceScoped }: UpdateParams
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
      validatedData = updateFileSchema.parse(body);
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
    
    const { content } = validatedData;
    
    try {
      // Update the file
      await workspace.files.update(params.fileName, content);
      
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
        `Failed to update file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
