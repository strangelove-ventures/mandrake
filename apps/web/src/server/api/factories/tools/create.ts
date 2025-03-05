import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/server/services/helpers';
import { z } from 'zod';
import { toolConfigSchema } from '@mandrake/workspace/src/types/workspace/tools';

type CreateParams = {
  params?: { id?: string };
  workspaceScoped: boolean;
};

// Create schema for config set creation
const createConfigSetSchema = z.object({
  id: z.string().min(1),
  config: toolConfigSchema
});

/**
 * Create a new tool config set
 */
export async function createConfigSet(
  req: NextRequest,
  { params, workspaceScoped }: CreateParams
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
      validatedData = createConfigSetSchema.parse(body);
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
    
    const { id, config } = validatedData;
    
    try {
      // Add new config set
      await toolsManager.addConfigSet(id, config);
      
      // Return the created config set
      const createdConfig = await toolsManager.getConfigSet(id);
      return createApiResponse({ id, config: createdConfig }, 201);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new ApiError(
          `Config set already exists: ${id}`,
          ErrorCode.RESOURCE_CONFLICT,
          409,
          error
        );
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to create config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
