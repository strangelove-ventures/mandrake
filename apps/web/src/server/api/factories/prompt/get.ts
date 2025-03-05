import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/server/services/helpers';

type GetParams = {
  params?: { id?: string };
  workspaceScoped: boolean;
};

/**
 * Get the prompt configuration
 */
export async function getPromptConfig(
  req: NextRequest,
  { params, workspaceScoped }: GetParams
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
    
    // Get the prompt config
    const config = await promptManager.getConfig();
    return createApiResponse(config);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to get prompt configuration: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
