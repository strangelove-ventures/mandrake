import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getMandrakeManager } from '../utils/workspace';

// Validation schemas
const workspaceCreateSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/, {
    message: 'Name must contain only letters, numbers, hyphens, and underscores'
  }),
  description: z.string().optional(),
  path: z.string().optional()
});

const workspaceUpdateSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/,{
    message: 'Name must contain only letters, numbers, hyphens, and underscores'
  }).optional(),
  description: z.string().optional()
});

/**
 * Creates handlers for /api/workspaces routes
 */
export function createWorkspacesRoutes() {
  return {
    /**
     * GET /api/workspaces - List all workspaces
     */
    async GET(req: NextRequest) {
      try {
        const mandrakeManager = getMandrakeManager();
        const workspaces = await mandrakeManager.listWorkspaces();
        return createApiResponse(workspaces);
      } catch (error) {
        throw new ApiError(
          `Failed to list workspaces: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    },
    
    /**
     * POST /api/workspaces - Create a new workspace
     */
    async POST(req: NextRequest) {
      try {
        const mandrakeManager = getMandrakeManager();
        const body = await validateBody(req, workspaceCreateSchema);
        
        const workspace = await mandrakeManager.createWorkspace(
          body.name,
          body.description,
          body.path
        );
        
        return createApiResponse({
          id: workspace.id,
          name: workspace.name,
          path: workspace.paths.root,
          description: body.description
        }, 201);
      } catch (error) {
        // Check for name conflict
        if (error instanceof Error && error.message.includes('already exists')) {
          throw new ApiError(
            error.message,
            ErrorCode.CONFLICT,
            409,
            error
          );
        }
        
        throw new ApiError(
          `Failed to create workspace: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    }
  };
}

/**
 * Creates handlers for /api/workspaces/[id] routes
 */
export function createWorkspaceRoutes() {
  return {
    /**
     * GET /api/workspaces/[id] - Get workspace details
     */
    async GET(req: NextRequest, { params }: { params: { id: string } }) {
      try {
        const { id } = params;
        const mandrakeManager = getMandrakeManager();
        const workspace = await mandrakeManager.getWorkspace(id);
        
        const config = await workspace.config.getConfig();
        return createApiResponse(config);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ApiError(
            `Workspace not found: ${params.id}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        throw new ApiError(
          `Failed to get workspace: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    },
    
    /**
     * PUT /api/workspaces/[id] - Update workspace
     */
    async PUT(req: NextRequest, { params }: { params: { id: string } }) {
      try {
        const { id } = params;
        const mandrakeManager = getMandrakeManager();
        const workspace = await mandrakeManager.getWorkspace(id);
        
        const body = await validateBody(req, workspaceUpdateSchema);
        
        // Update workspace config
        const currentConfig = await workspace.config.getConfig();
        await workspace.config.updateConfig({
          ...currentConfig,
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description })
        });
        
        // Get updated config
        const updatedConfig = await workspace.config.getConfig();
        return createApiResponse(updatedConfig);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ApiError(
            `Workspace not found: ${params.id}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        throw new ApiError(
          `Failed to update workspace: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    },
    
    /**
     * DELETE /api/workspaces/[id] - Delete workspace
     */
    async DELETE(req: NextRequest, { params }: { params: { id: string } }) {
      try {
        const { id } = params;
        const mandrakeManager = getMandrakeManager();
        await mandrakeManager.deleteWorkspace(id);
        return createNoContentResponse();
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ApiError(
            `Workspace not found: ${params.id}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        throw new ApiError(
          `Failed to delete workspace: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    }
  };
}
