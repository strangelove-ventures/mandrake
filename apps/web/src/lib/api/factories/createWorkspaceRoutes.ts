import { NextRequest } from 'next/server';
import { WorkspacesHandler } from '../handlers/WorkspacesHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { validateParams } from '../middleware/validation';
import { z } from 'zod';

// Parameter schemas
const workspaceIdSchema = z.object({
  id: z.string().min(1, "Workspace ID is required")
});

/**
 * Creates route handlers for workspace endpoints
 * @returns Route handler methods
 */
export function createWorkspaceRoutes() {
  return {
    // GET handler for listing workspaces or getting a specific workspace
    async GET(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        const mandrakeRoot = process.env.MANDRAKE_ROOT || '';
        const handler = new WorkspacesHandler(mandrakeRoot);
        
        // Handle specific workspace request
        if (params?.id) {
          const { id } = validateParams(params, workspaceIdSchema);
          const workspace = await handler.getWorkspace(id);
          return createApiResponse(workspace);
        }
        
        // List all workspaces
        const workspaces = await handler.listWorkspaces();
        return createApiResponse(workspaces);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // POST handler for creating a new workspace
    async POST(
      req: NextRequest
    ) {
      try {
        const mandrakeRoot = process.env.MANDRAKE_ROOT || '';
        const handler = new WorkspacesHandler(mandrakeRoot);
        
        // Create a new workspace
        const workspace = await handler.createWorkspace(req);
        return createApiResponse(workspace, 201);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT handler for updating a workspace
    async PUT(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.id) {
          return handleApiError(new Error("Workspace ID is required"));
        }
        
        const mandrakeRoot = process.env.MANDRAKE_ROOT || '';
        const handler = new WorkspacesHandler(mandrakeRoot);
        
        // Update a workspace
        const { id } = validateParams(params, workspaceIdSchema);
        const workspace = await handler.updateWorkspace(id, req);
        return createApiResponse(workspace);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // DELETE handler for removing a workspace
    async DELETE(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.id) {
          return handleApiError(new Error("Workspace ID is required"));
        }
        
        const mandrakeRoot = process.env.MANDRAKE_ROOT || '';
        const handler = new WorkspacesHandler(mandrakeRoot);
        
        // Delete a workspace
        const { id } = validateParams(params, workspaceIdSchema);
        await handler.deleteWorkspace(id);
        return createNoContentResponse();
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}
