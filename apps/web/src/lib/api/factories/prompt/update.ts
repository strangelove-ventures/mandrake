import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/lib/services/helpers';
import { z } from 'zod';
import { promptConfigSchema } from '@mandrake/workspace/src/types/workspace/prompt';

type UpdateParams = {
  params?: { id?: string };
  workspaceScoped: boolean;
};

/**
 * Update the prompt configuration
 */
export async function updatePromptConfig(
  req: NextRequest,
  { params, workspaceScoped }: UpdateParams
) {
  try {
    let promptManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      promptManager = workspace.prompt;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      promptManager = mandrake.prompt;
    }
    
    // Parse and validate request body
    const body = await req.json();
    let validatedData;
    
    try {
      validatedData = promptConfigSchema.parse(body);
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
    
    // Update the prompt config
    await promptManager.updateConfig(validatedData);
    
    // Get the updated config to return
    const updatedConfig = await promptManager.getConfig();
    return createApiResponse(updatedConfig);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to update prompt configuration: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
