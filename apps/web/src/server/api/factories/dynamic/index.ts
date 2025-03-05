import { NextRequest } from 'next/server';
import { listContexts, getContext } from './list';
import { createContext } from './create';
import { updateContext } from './update';
import { deleteContext } from './delete';

/**
 * Creates handlers for dynamic context routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createDynamicContextRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List dynamic contexts or get a specific context
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, contextId?: string } } = {}
    ) {
      // If contextId is provided, get a specific context
      if (params?.contextId) {
        return getContext(req, { params, workspaceScoped });
      }
      // Otherwise, list all contexts
      return listContexts(req, { params, workspaceScoped });
    },
    
    /**
     * POST - Create a new dynamic context
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return createContext(req, { params, workspaceScoped });
    },
    
    /**
     * PUT - Update a dynamic context
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, contextId: string } }
    ) {
      return updateContext(req, { params, workspaceScoped });
    },
    
    /**
     * DELETE - Remove a dynamic context
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, contextId: string } }
    ) {
      return deleteContext(req, { params, workspaceScoped });
    }
  };
}
