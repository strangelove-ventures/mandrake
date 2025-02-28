import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { validateBody } from '../../middleware/validation';
import { createApiResponse } from '../../utils/response';
import { getWorkspaceManagerForRequest } from '@/lib/services/helpers';

// Validation schema
const dynamicContextSchema = z.object({
  serverId: z.string(),
  methodName: z.string(),
  params: z.record(z.any()).optional().default({}),
  refresh: z.object({
    enabled: z.boolean()
  }).optional().default({ enabled: false })
});

type CreateParams = {
  params?: { id?: string };
  workspaceScoped: boolean;
};

/**
 * Create a new dynamic context
 */
export async function createContext(
  req: NextRequest,
  { params, workspaceScoped }: CreateParams
) {
  try {
    let dynamicManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      dynamicManager = workspace.dynamic;
    } else {
      // System doesn't have dynamic contexts
      throw new ApiError(
        'System-level dynamic contexts are not yet supported',
        ErrorCode.NOT_IMPLEMENTED,
        501
      );
    }
    
    const body = await validateBody(req, dynamicContextSchema);
    
    const result = await dynamicManager.create(body as any);
    return createApiResponse(result, 201);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to create dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
