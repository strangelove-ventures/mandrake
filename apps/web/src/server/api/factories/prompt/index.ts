import { NextRequest } from 'next/server';
import { getPromptConfig } from './get';
import { updatePromptConfig } from './update';

/**
 * Creates handlers for prompt routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createPromptRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get the prompt configuration
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return getPromptConfig(req, { params, workspaceScoped });
    },
    
    /**
     * PUT - Update the prompt configuration
     */
    async PUT(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return updatePromptConfig(req, { params, workspaceScoped });
    }
  };
}
