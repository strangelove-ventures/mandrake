import { NextRequest, NextResponse } from 'next/server';
import { DynamicContextHandler } from '../handlers/DynamicContextHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getWorkspaceManager } from '../utils/workspace';
import { validateParams } from '../middleware/validation';
import { z } from 'zod';

const dynamicContextIdSchema = z.object({
  contextId: z.string().min(1, "Context ID is required")
});

/**
 * Creates route handlers for dynamic context endpoints
 * @param isWorkspaceScope Whether these routes are for workspace-specific contexts
 * @returns Route handler methods
 */
export function createDynamicContextRoutes(isWorkspaceScope: boolean = false) {
  return {
    // GET handler for listing contexts or getting a specific context
    async GET(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: DynamicContextHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new DynamicContextHandler(workspaceId, workspaceManager);
        } else {
          handler = new DynamicContextHandler();
        }
        
        // Handle specific context request if contextId is provided
        if (params?.contextId) {
          const { contextId } = validateParams(params, dynamicContextIdSchema);
          return createApiResponse(await handler.getContextDetails(contextId));
        } 
        
        // Otherwise list all contexts
        return createApiResponse(await handler.listContexts());
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // POST handler for creating a new context
    async POST(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: DynamicContextHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new DynamicContextHandler(workspaceId, workspaceManager);
        } else {
          handler = new DynamicContextHandler();
        }
        
        // Create the new context and get its ID
        const contextId = await handler.addContext(req);
        
        // If we have the ID, we need to get the full context details to return
        if (workspaceId) {
          const workspaceManager = await getWorkspaceManager(workspaceId);
          const details = await workspaceManager.dynamic.get(contextId);
          return createApiResponse(details, 201);
        }
        
        // Fallback to just returning the ID if we can't get full details
        return createApiResponse({ id: contextId }, 201);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT handler for updating a context
    async PUT(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        // Validate that we have a context ID
        const { contextId } = validateParams(params || {}, dynamicContextIdSchema);
        
        let workspaceId: string | undefined;
        let handler: DynamicContextHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new DynamicContextHandler(workspaceId, workspaceManager);
        } else {
          handler = new DynamicContextHandler();
        }
        
        // Update the context (returns void)
        await handler.updateContext(contextId, req);
        
        // Fetch and return the updated context
        if (workspaceId) {
          const workspaceManager = await getWorkspaceManager(workspaceId);
          const updated = await workspaceManager.dynamic.get(contextId);
          return createApiResponse(updated);
        }
        
        // Fallback to empty success response
        return createApiResponse({ success: true });
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // DELETE handler for removing a context
    async DELETE(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        // Validate that we have a context ID
        const { contextId } = validateParams(params || {}, dynamicContextIdSchema);
        
        let workspaceId: string | undefined;
        let handler: DynamicContextHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new DynamicContextHandler(workspaceId, workspaceManager);
        } else {
          handler = new DynamicContextHandler();
        }
        
        // Remove the context
        await handler.removeContext(contextId);
        return createNoContentResponse();
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}