import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { DynamicContextMethodConfig, dynamicContextMethodSchema } from '@mandrake/workspace';

/**
 * Handles dynamic context operations for both system and workspace levels
 */
export class DynamicContextHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  /**
   * Lists all dynamic contexts
   * @returns Array of dynamic context objects
   */
  async listContexts(): Promise<DynamicContextMethodConfig[]> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        return this.workspaceManager.dynamic.list();
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level dynamic contexts not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to list dynamic contexts: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Adds a new dynamic context
   * @param req HTTP request with dynamic context data
   * @returns The created dynamic context
   */
  async addContext(req: NextRequest): Promise<string> {
    try {
      // Import the schema from workspace package
      const data = await validateBody(req, dynamicContextMethodSchema);
      
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        return this.workspaceManager.dynamic.create(data);
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level dynamic contexts not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to add dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a specific dynamic context by ID
   * @param contextId Dynamic context ID
   * @returns The dynamic context
   */
  async getContextDetails(contextId: string): Promise<DynamicContextMethodConfig> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        const context = await this.workspaceManager.dynamic.get(contextId);
        
        if (!context) {
          throw new ApiError(
            `Dynamic context not found: ${contextId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        return context;
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level dynamic contexts not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to get dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a dynamic context
   * @param contextId Dynamic context ID
   * @param req HTTP request with dynamic context data
   * @returns The updated dynamic context
   */
  async updateContext(contextId: string, req: NextRequest): Promise<void> {
    try {
      // Import the schema from workspace package and make it partial
      const data = await validateBody(req, dynamicContextMethodSchema.partial());
      
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        const existing = await this.workspaceManager.dynamic.get(contextId);
        
        if (!existing) {
          throw new ApiError(
            `Dynamic context not found: ${contextId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        return this.workspaceManager.dynamic.update(contextId, {
          ...existing,
          ...data
        });
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level dynamic contexts not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to update dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Removes a dynamic context
   * @param contextId Dynamic context ID
   */
  async removeContext(contextId: string): Promise<void> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        const existing = await this.workspaceManager.dynamic.get(contextId);
        
        if (!existing) {
          throw new ApiError(
            `Dynamic context not found: ${contextId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404
          );
        }
        
        await this.workspaceManager.dynamic.delete(contextId);
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level dynamic contexts not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to remove dynamic context: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}