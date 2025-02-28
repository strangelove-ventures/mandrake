import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getMandrakeManager, getWorkspaceManagerById } from '../utils/workspace';

// Validation schemas
const dynamicContextSchema = z.object({
  serverId: z.string(),
  methodName: z.string(),
  params: z.record(z.any()).optional(),
  refresh: z.object({
    enabled: z.boolean()
  }).optional()
});

const dynamicContextUpdateSchema = z.object({
  serverId: z.string().optional(),
  methodName: z.string().optional(),
  params: z.record(z.any()).optional(),
  refresh: z.object({
    enabled: z.boolean()
  }).optional()
});

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
          const workspace = await getWorkspaceManagerById(params.id);
          dynamicManager = workspace.dynamic;
        } else {
          // System doesn't have dynamic contexts, but we could adapt to use
          // a manager here if we had one in the future
          throw new ApiError(
            'System-level dynamic contexts are not yet supported',
            ErrorCode.NOT_IMPLEMENTED,
            501
          );
        }
        
        if (params?.contextId) {
          // Get specific context
          const context = await dynamicManager.get(params.contextId);
          if (!context) {
            throw new ApiError(
              `Dynamic context not found: ${params.contextId}`,
              ErrorCode.RESOURCE_NOT_FOUND,
              404
            );
          }
          return createApiResponse(context);
        } else {
          // List all contexts
          const contexts = await dynamicManager.list();
          return createApiResponse(contexts);
        }
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to get dynamic contexts: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * POST - Create a new dynamic context
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
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
          const workspace = await getWorkspaceManagerById(params.id);
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
    },
    
    /**
     * PUT - Update a dynamic context
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, contextId: string } }
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
          const workspace = await getWorkspaceManagerById(params.id);
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
        
        const result = await dynamicManager.update(params.contextId, updated);
        return createApiResponse(result);
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
    },
    
    /**
     * DELETE - Remove a dynamic context
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, contextId: string } }
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
          const workspace = await getWorkspaceManagerById(params.id);
          dynamicManager = workspace.dynamic;
        } else {
          // System doesn't have dynamic contexts
          throw new ApiError(
            'System-level dynamic contexts are not yet supported',
            ErrorCode.NOT_IMPLEMENTED,
            501
          );
        }
        
        await dynamicManager.delete(params.contextId);
        return createNoContentResponse();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to delete dynamic context: ${error instanceof Error ? error.message : String(error)}`,
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
