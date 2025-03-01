import { NextRequest } from 'next/server';
import { listWorkspaces, getWorkspaceDetails } from './list';
import { createWorkspace } from './create';
import { updateWorkspace } from './update';
import { deleteWorkspace } from './delete';
import { adoptWorkspace } from './adopt';

/**
 * Creates handlers for workspace routes
 */
export function createWorkspacesRoutes() {
  return {
    /**
     * GET - List all workspaces
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id: string } } = {}
    ) {
      // If ID is provided, get details of a specific workspace
      if (params?.id) {
        return getWorkspaceDetails(req, params);
      }
      // Otherwise, list all workspaces
      return listWorkspaces(req);
    },
    
    /**
     * POST - Create a new workspace
     */
    async POST(
      req: NextRequest
    ) {
      return createWorkspace(req);
    },
    
    /**
     * PUT - Update a workspace
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id: string } }
    ) {
      return updateWorkspace(req, params);
    },
    
    /**
     * DELETE - Delete a workspace
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id: string } }
    ) {
      return deleteWorkspace(req, params);
    }
  };
}

/**
 * Creates handlers for workspace adoption routes
 */
export function createWorkspaceAdoptRoutes() {
  return {
    /**
     * POST - Adopt an existing workspace
     */
    async POST(
      req: NextRequest
    ) {
      return adoptWorkspace(req);
    }
  };
}
