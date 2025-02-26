import { NextRequest } from 'next/server';
import { FilesHandler } from '../handlers/FilesHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getWorkspaceManager } from '../utils/workspace';
import { validateParams, validateQuery } from '../middleware/validation';
import { z } from 'zod';

// Parameter schemas
const fileNameSchema = z.object({
  fileName: z.string().min(1, "File name is required")
});

// Fixed schema to properly handle string to boolean conversion
const activeQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional()
}).transform(data => ({
  active: data.active === 'true' ? true : data.active === 'false' ? false : undefined
}));

/**
 * Creates route handlers for files endpoints in workspace context
 * @returns Route handler methods
 */
export function createFilesRoutes() {
  return {
    // GET handler for listing files or getting a specific file
    async GET(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.id) {
          return handleApiError(new Error("Workspace ID is required"));
        }
        
        const workspaceId = params.id as string;
        const workspaceManager = await getWorkspaceManager(workspaceId);
        const handler = new FilesHandler(workspaceId, workspaceManager);
        
        // Handle specific file request
        if (params?.fileName) {
          const { fileName } = validateParams(params, fileNameSchema);
          const file = await handler.getFile(fileName);
          return createApiResponse(file);
        }
        
        // Get active status from query or default to true
        let active = true;
        try {
          const url = new URL(req.url);
          const activeParam = url.searchParams.get('active');
          if (activeParam === 'false') {
            active = false;
          }
        } catch (e) {
          // Default to true if URL parsing fails
        }
        
        // List all files
        const files = await handler.listFiles(active);
        return createApiResponse(files);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // POST handler for creating a new file
    async POST(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.id) {
          return handleApiError(new Error("Workspace ID is required"));
        }
        
        const workspaceId = params.id as string;
        const workspaceManager = await getWorkspaceManager(workspaceId);
        const handler = new FilesHandler(workspaceId, workspaceManager);
        
        // Create a new file
        if (params?.fileName) {
          const { fileName } = validateParams(params, fileNameSchema);
          const file = await handler.createFile(fileName, req);
          return createApiResponse(file, 201);
        }
        
        return handleApiError(new Error('Missing fileName parameter'));
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT handler for updating a file
    async PUT(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.id) {
          return handleApiError(new Error("Workspace ID is required"));
        }
        
        const workspaceId = params.id as string;
        const workspaceManager = await getWorkspaceManager(workspaceId);
        const handler = new FilesHandler(workspaceId, workspaceManager);
        
        // Update a file
        if (params?.fileName) {
          const { fileName } = validateParams(params, fileNameSchema);
          
          // Handle active status update 
          if (req.url.includes('/active')) {
            const file = await handler.setFileActive(fileName, req);
            return createApiResponse(file);
          }
          
          // Handle content update
          const file = await handler.updateFile(fileName, req);
          return createApiResponse(file);
        }
        
        return handleApiError(new Error('Missing fileName parameter'));
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // DELETE handler for removing a file
    async DELETE(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        if (!params?.id) {
          return handleApiError(new Error("Workspace ID is required"));
        }
        
        const workspaceId = params.id as string;
        const workspaceManager = await getWorkspaceManager(workspaceId);
        const handler = new FilesHandler(workspaceId, workspaceManager);
        
        // Delete a file
        if (params?.fileName) {
          const { fileName } = validateParams(params, fileNameSchema);
          await handler.deleteFile(fileName);
          return createNoContentResponse();
        }
        
        return handleApiError(new Error('Missing fileName parameter'));
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}
