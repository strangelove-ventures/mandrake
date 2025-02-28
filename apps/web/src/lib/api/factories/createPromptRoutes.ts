import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { createApiResponse } from '../utils/response';
import { getMandrakeManager, getWorkspaceManagerById } from '../utils/workspace';

// Validation schema
const promptConfigSchema = z.object({
  instructions: z.string().optional(),
  includeWorkspaceMetadata: z.boolean().optional(),
  includeSystemInfo: z.boolean().optional(),
  includeDateTime: z.boolean().optional(),
  includeTools: z.boolean().optional(),
  includeFiles: z.boolean().optional(),
  includeDynamicContext: z.boolean().optional()
});

/**
 * Creates handlers for prompt routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createPromptRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get prompt configuration
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
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
          const workspace = await getWorkspaceManagerById(params.id);
          promptManager = workspace.prompt;
        } else {
          const mandrakeManager = getMandrakeManager();
          promptManager = mandrakeManager.prompt;
        }
        
        const config = await promptManager.getConfig();
        return createApiResponse(config);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to get prompt config: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * PUT - Update prompt configuration
     */
    async PUT(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
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
          const workspace = await getWorkspaceManagerById(params.id);
          promptManager = workspace.prompt;
        } else {
          const mandrakeManager = getMandrakeManager();
          promptManager = mandrakeManager.prompt;
        }
        
        const body = await validateBody(req, promptConfigSchema);
        
        // Get current config to merge with updates
        const currentConfig = await promptManager.getConfig();
        const updatedConfig = {
          ...currentConfig,
          ...body
        };
        
        // Update config
        await promptManager.updateConfig(updatedConfig);
        
        // Get latest config
        const latestConfig = await promptManager.getConfig();
        return createApiResponse(latestConfig);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to update prompt config: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
  };
}
