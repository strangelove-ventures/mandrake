import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getMandrakeManagerForRequest } from '@/server/services/helpers';
import { z } from 'zod';

// Schema for creating a new workspace
const createWorkspaceSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/),
  description: z.string().optional(),
  path: z.string().optional(),
});

/**
 * Create a new workspace
 */
export async function createWorkspace(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    
    try {
      const data = createWorkspaceSchema.parse(body);
      const mandrakeManager = await getMandrakeManagerForRequest();
      
      try {
        // Create the workspace
        const workspace = await mandrakeManager.createWorkspace(
          data.name,
          data.description,
          data.path
        );
        
        // Get workspace info to return
        const workspaceInfo = await mandrakeManager.config.findWorkspaceById(workspace.id);
        
        // Return success with the created workspace
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
        `Failed to create workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
