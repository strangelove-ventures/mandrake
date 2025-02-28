import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/lib/services/helpers';
import { z } from 'zod';

type ActiveParams = {
  params: { id?: string };
  workspaceScoped: boolean;
};

// Schema for setting active config set
const activeSetSchema = z.object({
  id: z.string().min(1),
});

/**
 * Get the active config set
 */
export async function getActiveConfigSet(
  req: NextRequest,
  { params, workspaceScoped }: ActiveParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    try {
      // Get active config set ID
      const activeSetId = await toolsManager.getActive();
      
      // Get the config set details
      const configSet = await toolsManager.getConfigSet(activeSetId);
      
      return createApiResponse({ active: activeSetId, config: configSet });
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Config set not found')) {
          throw new ApiError(
            `Active config set not found`,
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
        `Failed to get active config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Set the active config set
 */
export async function setActiveConfigSet(
  req: NextRequest,
  { params, workspaceScoped }: ActiveParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    // Parse and validate request body
    const body = await req.json();
    let validatedData;
    
    try {
      validatedData = activeSetSchema.parse(body);
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
    
    const { id } = validatedData;
    
    try {
      // Set active config set
      await toolsManager.setActive(id);
      
      // Get the updated config set details
      const configSet = await toolsManager.getConfigSet(id);
      
      return createApiResponse({ active: id, config: configSet });
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Config set not found')) {
          throw new ApiError(
            `Config set not found: ${id}`,
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
        `Failed to set active config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
