import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { getMandrakeManagerForRequest } from '@/server/services/helpers';
import { z } from 'zod';

// Schema for updating a workspace
const updateWorkspaceSchema = z.object({
  description: z.string().optional(),
  // Note: We don't support updating name or path here
});

/**
 * Update a workspace's details
 */
export async function updateWorkspace(
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
    
    // Parse and validate request body
    const body = await req.json();
    
    try {
      const updates = updateWorkspaceSchema.parse(body);
      const mandrakeManager = await getMandrakeManagerForRequest();
      
      try {
        // First check if workspace exists
        const workspaceInfo = await mandrakeManager.config.findWorkspaceById(params.id);
        
        if (!workspaceInfo) {
          throw new ApiError(
            `Workspace not found: ${params.id}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        // Get the workspace to update its config
        const workspace = await mandrakeManager.getWorkspace(params.id);
        
        // Apply updates to workspace config
        if (updates.description !== undefined) {
          const currentConfig = await workspace.config.getConfig();
          await workspace.config.updateConfig({
            ...currentConfig,
            description: updates.description
          });
          
          // Also update the workspace registration in the mandrake config
          // by re-registering it with the new description
          await mandrakeManager.config.registerWorkspace({
            ...workspaceInfo,
            description: updates.description
          });
        }
        
        // Get the updated workspace details
        const updatedWorkspaceInfo = await mandrakeManager.config.findWorkspaceById(params.id);
        const updatedConfig = await workspace.config.getConfig();
        
        // Return the updated workspace
        return createApiResponse({
          ...updatedWorkspaceInfo,
          ...updatedConfig
        });
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
        `Failed to update workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
