import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest
} from '@/server/services/helpers';
import { z } from 'zod';

type CreateParams = {
  params?: { id?: string };
  workspaceScoped: boolean;
};

// Create schema for file creation
const createFileSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
  active: z.boolean().optional().default(true)
});

/**
 * Create a new file
 */
export async function createFile(
  req: NextRequest,
  { params, workspaceScoped }: CreateParams
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
      validatedData = createFileSchema.parse(body);
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
    
    const { name, content, active } = validatedData;
    
    try {
      // Create new file
      await workspace.files.create(name, content, active);
      
      // Get the created file to return
      const file = await workspace.files.get(name);
      return createApiResponse(file, 201);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          throw new ApiError(
            `File already exists: ${name}`,
            ErrorCode.RESOURCE_CONFLICT,
            409,
            error
          );
        }
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to create file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
