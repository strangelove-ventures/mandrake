import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getMandrakeManagerForRequest } from '@/server/services/helpers';
import { z } from 'zod';

// Schema for adopting a workspace
const adoptWorkspaceSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/),
  path: z.string(),
  description: z.string().optional(),
});

/**
 * Adopt an existing workspace
 */
export async function adoptWorkspace(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    
    try {
      const data = adoptWorkspaceSchema.parse(body);
      const mandrakeManager = await getMandrakeManagerForRequest();
      
      try {
        // Adopt the workspace
        const workspace = await mandrakeManager.adoptWorkspace(
          data.name,
          data.path,
          data.description
        );
        
        // Get workspace info to return
        const workspaceInfo = await mandrakeManager.config.findWorkspaceById(workspace.id);
        
        // Return success with the adopted workspace
        return createApiResponse(workspaceInfo, 201);
      } catch (error) {
        // Handle specific errors
        if (error instanceof Error) {
          if (error.message.includes('already exists')) {
            throw new ApiError(
              `Workspace "${data.name}" already exists`,
              ErrorCode.RESOURCE_CONFLICT,
              409,
              error
            );
          }
          if (error.message.includes('Cannot adopt')) {
            throw new ApiError(
              `Cannot adopt workspace at path "${data.path}": ${error.message}`,
              ErrorCode.BAD_REQUEST,
              400,
              error
            );
          }
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        
        throw new ApiError(
          `Invalid request data: ${errorMessages}`,
          ErrorCode.VALIDATION_ERROR,
          400,
          error
        );
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to adopt workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
