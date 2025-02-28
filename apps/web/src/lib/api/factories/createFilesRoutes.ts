import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getWorkspaceManagerById } from '../utils/workspace';

// Validation schema
const fileContentSchema = z.object({
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']).optional()
});

/**
 * Creates handlers for workspace file routes
 */
export function createFilesRoutes() {
  return {
    /**
     * GET - List files or get file content
     */
    async GET(
      req: NextRequest,
      { params }: { params: { id: string, fileName?: string } }
    ) {
      try {
        const { id, fileName } = params;
        const workspace = await getWorkspaceManagerById(id);
        
        if (fileName) {
          // Get specific file
          const fileContent = await workspace.files.read(fileName);
          return createApiResponse({
            name: fileName,
            content: fileContent
          });
        } else {
          // List all files
          const files = await workspace.files.list();
          return createApiResponse(files);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ApiError(
            `File not found: ${params.fileName}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        throw new ApiError(
          `Failed to access files: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    },
    
    /**
     * POST - Create a new file
     */
    async POST(
      req: NextRequest,
      { params }: { params: { id: string } }
    ) {
      try {
        const { id } = params;
        const workspace = await getWorkspaceManagerById(id);
        const body = await validateBody(req, fileContentSchema);
        
        // For form uploads, need to extract file name from the form data
        // This is a simple implementation that expects the file content in JSON
        // For multipart form data, you would need to handle differently
        const fileName = req.headers.get('x-file-name');
        
        if (!fileName) {
          throw new ApiError(
            'File name is required',
            ErrorCode.BAD_REQUEST,
            400
          );
        }
        
        // Check if file already exists
        const files = await workspace.files.list();
        if (files.some(file => file.name === fileName)) {
          throw new ApiError(
            `File ${fileName} already exists`,
            ErrorCode.CONFLICT,
            409
          );
        }
        
        // Create file
        await workspace.files.write(fileName, body.content, body.encoding);
        
        return createApiResponse({
          name: fileName,
          created: true
        }, 201);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to create file: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * PUT - Update file content
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id: string, fileName: string } }
    ) {
      try {
        const { id, fileName } = params;
        const workspace = await getWorkspaceManagerById(id);
        const body = await validateBody(req, fileContentSchema);
        
        // Check if file exists
        try {
          await workspace.files.read(fileName);
        } catch (error) {
          throw new ApiError(
            `File ${fileName} not found`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error instanceof Error ? error : undefined
          );
        }
        
        // Update file
        await workspace.files.write(fileName, body.content, body.encoding);
        
        return createApiResponse({
          name: fileName,
          updated: true
        });
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to update file: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    },
    
    /**
     * DELETE - Remove a file
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id: string, fileName: string } }
    ) {
      try {
        const { id, fileName } = params;
        const workspace = await getWorkspaceManagerById(id);
        
        // Check if file exists
        try {
          await workspace.files.read(fileName);
        } catch (error) {
          throw new ApiError(
            `File ${fileName} not found`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error instanceof Error ? error : undefined
          );
        }
        
        // Delete file
        await workspace.files.delete(fileName);
        
        return createNoContentResponse();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
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
