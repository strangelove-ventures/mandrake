import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { validateBody } from '../../middleware/validation';
import { createApiResponse } from '../../utils/response';
import { getWorkspaceManagerForRequest } from '@/lib/services/helpers';

// Validation schema
const dynamicContextUpdateSchema = z.object({
  serverId: z.string().optional(),
  methodName: z.string().optional(),
  params: z.record(z.any()).optional(),
  refresh: z.object({
    enabled: z.boolean()
  }).optional()
});

type UpdateParams = {
  params: { id?: string, contextId: string };
  workspaceScoped: boolean;
};

/**
 * Update a dynamic context
 */
export async function updateContext(
  req: NextRequest,
  { params, workspaceScoped }: UpdateParams
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
    
    const body = await validateBody(req, dynamicContextUpdateSchema);
    
    // Get existing context
    const existing = await dynamicManager.get(params.contextId);
    if (!existing) {
      throw new ApiError(
        `Dynamic context not found: ${params.contextId}`,
        ErrorCode.RESOURCE_NOT_FOUND,
        404
      );
    }
    
    // Update context
    const updated = {
      ...existing,
      ...body
    };
    
    await dynamicManager.update(params.contextId, updated);
    const { id, ...restUpdated } = updated;
    return createApiResponse({ id: params.contextId, ...restUpdated });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to update dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
