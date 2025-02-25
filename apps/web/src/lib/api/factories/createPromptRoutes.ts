import { NextRequest } from 'next/server';
import { PromptHandler } from '../handlers/PromptHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse } from '../utils/response';
import { getWorkspaceManager } from '../utils/workspace';

/**
 * Creates route handlers for prompt endpoints
 * @param isWorkspaceScope Whether these routes are for workspace-specific prompts
 * @returns Route handler methods
 */
export function createPromptRoutes(isWorkspaceScope: boolean = false) {
  return {
    // GET handler for retrieving prompt config
    async GET(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: PromptHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new PromptHandler(workspaceId, workspaceManager);
        } else {
          handler = new PromptHandler();
        }
        
        // Get prompt config
        const config = await handler.getConfig();
        return createApiResponse(config);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT handler for updating prompt config
    async PUT(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: PromptHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new PromptHandler(workspaceId, workspaceManager);
        } else {
          handler = new PromptHandler();
        }
        
        // Update prompt config
        await handler.updateConfig(req);
        
        // Return updated config
        const config = await handler.getConfig();
        return createApiResponse(config);
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}