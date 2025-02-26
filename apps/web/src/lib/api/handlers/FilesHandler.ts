import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';

// Schema for creating or updating a file
const fileContentSchema = z.object({
  content: z.string(),
  active: z.boolean().optional().default(true),
});

// Schema for updating file active status
const fileActiveSchema = z.object({
  active: z.boolean(),
});

/**
 * Handles file operations for workspace files
 */
export class FilesHandler {
  constructor(
    private workspaceId: string, 
    private workspaceManager: WorkspaceManager
  ) {}

  /**
   * Lists all files in a workspace
   * @param active Whether to list active files (true) or inactive files (false)
   * @returns Array of file info objects
   */
  async listFiles(active: boolean = true): Promise<any[]> {
    try {
      return this.workspaceManager.files.list(active);
    } catch (error) {
      throw new ApiError(
        `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a file by name
   * @param fileName File name
   * @returns File info object
   */
  async getFile(fileName: string): Promise<any> {
    try {
      try {
        return await this.workspaceManager.files.get(fileName);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          throw new ApiError(
            `File not found: ${fileName}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            err
          );
        }
        throw err;
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to get file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates a new file
   * @param fileName File name
   * @param req HTTP request with file content
   * @returns File info object
   */
  async createFile(fileName: string, req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, fileContentSchema);
      
      try {
        await this.workspaceManager.files.create(fileName, data.content, data.active);
        return this.getFile(fileName);
      } catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
          throw new ApiError(
            `File already exists: ${fileName}`,
            ErrorCode.CONFLICT,
            409,
            err
          );
        }
        throw err;
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to create file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a file's content
   * @param fileName File name
   * @param req HTTP request with updated file content
   * @returns Updated file info
   */
  async updateFile(fileName: string, req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, fileContentSchema);
      
      try {
        // First check if file exists
        await this.getFile(fileName);
        
        // Update content
        await this.workspaceManager.files.update(fileName, data.content);
        
        // Update active status if specified
        if (data.active !== undefined) {
          await this.workspaceManager.files.setActive(fileName, data.active);
        }
        
        return this.getFile(fileName);
      } catch (err) {
        if (err instanceof ApiError && err.code === ErrorCode.RESOURCE_NOT_FOUND) {
          throw err;
        }
        throw new ApiError(
          `Failed to update file: ${err instanceof Error ? err.message : String(err)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          err instanceof Error ? err : undefined
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to update file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sets a file's active status
   * @param fileName File name
   * @param req HTTP request with active status
   * @returns Updated file info
   */
  async setFileActive(fileName: string, req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, fileActiveSchema);
      
      try {
        // First check if file exists
        await this.getFile(fileName);
        
        // Set active status
        await this.workspaceManager.files.setActive(fileName, data.active);
        
        return this.getFile(fileName);
      } catch (err) {
        if (err instanceof ApiError && err.code === ErrorCode.RESOURCE_NOT_FOUND) {
          throw err;
        }
        throw new ApiError(
          `Failed to set file active status: ${err instanceof Error ? err.message : String(err)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          err instanceof Error ? err : undefined
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to set file active status: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deletes a file
   * @param fileName File name
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      try {
        // First check if file exists
        await this.getFile(fileName);
        
        // Delete the file
        await this.workspaceManager.files.delete(fileName);
      } catch (err) {
        if (err instanceof ApiError && err.code === ErrorCode.RESOURCE_NOT_FOUND) {
          throw err;
        }
        throw new ApiError(
          `Failed to delete file: ${err instanceof Error ? err.message : String(err)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          err instanceof Error ? err : undefined
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}
