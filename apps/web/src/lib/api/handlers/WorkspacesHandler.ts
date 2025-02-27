import { NextRequest } from 'next/server';
import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import { 
  getMandrakeManagerForRequest,
  listWorkspacesForRequest,
  createWorkspaceForRequest,
  deleteWorkspaceForRequest,
  adoptWorkspaceForRequest
} from '../../services/helpers';

// Schema for creating a new workspace
const createWorkspaceSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/, 'Workspace name must contain only letters, numbers, hyphens, and underscores'),
  description: z.string().optional(),
  path: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

// Schema for updating a workspace
const updateWorkspaceSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/, 'Workspace name must contain only letters, numbers, hyphens, and underscores').optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

// Schema for adopting an existing workspace
const adoptWorkspaceSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/, 'Workspace name must contain only letters, numbers, hyphens, and underscores'),
  path: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

/**
 * Handles workspace operations at the system level
 */
export class WorkspacesHandler {
  constructor(
    private mandrakeManager?: MandrakeManager
  ) {}

  /**
   * Ensures that the handler has a MandrakeManager
   * @returns MandrakeManager instance
   */
  private async getMandrakeManager(): Promise<MandrakeManager> {
    if (!this.mandrakeManager) {
      this.mandrakeManager = await getMandrakeManagerForRequest();
    }
    return this.mandrakeManager;
  }

  /**
   * Lists all workspaces
   * @returns Array of workspace objects
   */
  async listWorkspaces(): Promise<any[]> {
    try {
      const workspaces = await listWorkspacesForRequest();
      
      // Get details for each workspace
      const manager = await this.getMandrakeManager();
      const workspaceConfigs = await Promise.all(
        workspaces.map(async (ws) => {
          try {
            const workspaceManager = await manager.getWorkspace(ws.name);
            return workspaceManager.getConfig();
          } catch (error) {
            // Skip workspaces that can't be loaded
            return null;
          }
        })
      );
      
      // Filter out any null results
      return workspaceConfigs.filter(Boolean);
    } catch (error) {
      throw new ApiError(
        `Failed to list workspaces: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a workspace by ID
   * @param workspaceId Workspace ID or name
   * @returns Workspace object
   */
  async getWorkspace(workspaceId: string): Promise<any> {
    try {
      const manager = await this.getMandrakeManager();
      
      try {
        const workspaceManager = await manager.getWorkspace(workspaceId);
        return workspaceManager.getConfig();
      } catch (err) {
        throw new ApiError(
          `Workspace not found: ${workspaceId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          err instanceof Error ? err : undefined
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to get workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates a new workspace
   * @param req HTTP request with workspace data
   * @returns Created workspace
   */
  async createWorkspace(req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, createWorkspaceSchema);
      
      try {
        let workspaceManager;

        // If path is provided, attempt to adopt existing workspace or create at custom path
        if (data.path) {
          try {
            // First try to adopt an existing workspace
            workspaceManager = await adoptWorkspaceForRequest(
              data.name,
              data.path,
              data.description
            );
          } catch (err) {
            // If adoption fails, create a new workspace at the specified path
            const manager = await this.getMandrakeManager();
            workspaceManager = await manager.createWorkspace(
              data.name,
              data.description,
              data.path
            );
          }
        } else {
          // Create in default location
          workspaceManager = await createWorkspaceForRequest(data.name, data.description);
        }

        // If metadata is provided, update the workspace config
        if (data.metadata) {
          await workspaceManager.updateConfig({ metadata: data.metadata });
        }

        return workspaceManager.getConfig();
      } catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
          throw new ApiError(
            `Workspace already exists: ${data.name}`,
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
        `Failed to create workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Adopts an existing workspace from a different location
   * @param req HTTP request with workspace data
   * @returns Adopted workspace
   */
  async adoptWorkspace(req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, adoptWorkspaceSchema);
      
      try {
        const workspaceManager = await adoptWorkspaceForRequest(data.name, data.path, data.description);
        
        // If metadata is provided, update the workspace config
        if (data.metadata) {
          await workspaceManager.updateConfig({ metadata: data.metadata });
        }
        
        return workspaceManager.getConfig();
      } catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
          throw new ApiError(
            `Workspace already exists: ${data.name}`,
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
        `Failed to adopt workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a workspace
   * @param workspaceId Workspace ID or name
   * @param req HTTP request with updated workspace data
   * @returns Updated workspace
   */
  async updateWorkspace(workspaceId: string, req: NextRequest): Promise<any> {
    try {
      const data = await validateBody(req, updateWorkspaceSchema);
      const manager = await this.getMandrakeManager();
      
      try {
        // Get the workspace manager
        const workspaceManager = await manager.getWorkspace(workspaceId);
        
        // Update the workspace config
        await workspaceManager.updateConfig({
          name: data.name,
          description: data.description,
          metadata: data.metadata
        });
        
        // Return the updated config
        return workspaceManager.getConfig();
      } catch (err) {
        throw new ApiError(
          `Workspace not found: ${workspaceId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          err instanceof Error ? err : undefined
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to update workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deletes a workspace
   * @param workspaceId Workspace ID or name
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      try {
        await deleteWorkspaceForRequest(workspaceId);
      } catch (err) {
        if (err instanceof Error && err.message.includes('ENOENT')) {
          throw new ApiError(
            `Workspace not found: ${workspaceId}`,
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
        `Failed to delete workspace: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}