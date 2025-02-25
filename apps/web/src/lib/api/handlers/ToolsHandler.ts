import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { ToolConfig, ServerConfig, serverConfigSchema, toolConfigSchema } from '@mandrake/workspace';
import { z } from 'zod';

/**
 * Handles tools operations for both system and workspace levels
 */
export class ToolsHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  /**
   * Lists all config sets
   * @returns Array of config set IDs
   */
  async listConfigSets(): Promise<string[]> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        return this.workspaceManager.tools.listConfigSets();
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to list config sets: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets the active config set ID
   * @returns Active config set ID
   */
  async getActive(): Promise<string> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        return this.workspaceManager.tools.getActive();
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to get active config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sets the active config set
   * @param setId Config set ID to set as active
   */
  async setActive(setId: string): Promise<void> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        await this.workspaceManager.tools.setActive(setId);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to set active config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a config set by ID
   * @param setId Config set ID
   * @returns Tool config (map of server IDs to ServerConfig)
   */
  async getConfigSet(setId: string): Promise<ToolConfig> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        return await this.workspaceManager.tools.getConfigSet(setId);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('not found')) {
        throw new ApiError(
          `Config set not found: ${setId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to get config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Adds a new config set
   * @param setId Config set ID
   * @param req HTTP request with tool config data
   */
  async addConfigSet(setId: string, req: NextRequest): Promise<void> {
    try {
      const data = await validateBody(req, toolConfigSchema);
      
      if (this.workspaceId && this.workspaceManager) {
        await this.workspaceManager.tools.addConfigSet(setId, data);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('already exists')) {
        throw new ApiError(
          `Config set already exists: ${setId}`,
          ErrorCode.CONFLICT,
          409,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to add config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a config set
   * @param setId Config set ID
   * @param req HTTP request with partial tool config data
   */
  async updateConfigSet(setId: string, req: NextRequest): Promise<void> {
    try {
      const data = await validateBody(req, toolConfigSchema);
      
      if (this.workspaceId && this.workspaceManager) {
        await this.workspaceManager.tools.updateConfigSet(setId, data);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('not found')) {
        throw new ApiError(
          `Config set not found: ${setId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to update config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Removes a config set
   * @param setId Config set ID
   */
  async removeConfigSet(setId: string): Promise<void> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        await this.workspaceManager.tools.removeConfigSet(setId);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('not found')) {
        throw new ApiError(
          `Config set not found: ${setId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to remove config set: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a server config within a config set
   * @param setId Config set ID
   * @param serverId Server ID
   * @returns Server config
   */
  async getServerConfig(setId: string, serverId: string): Promise<ServerConfig> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        return await this.workspaceManager.tools.getServerConfig(setId, serverId);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('not found')) {
        throw new ApiError(
          `Server or config set not found: ${setId}/${serverId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to get server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Adds a server config to a config set
   * @param setId Config set ID
   * @param serverId Server ID
   * @param req HTTP request with server config data
   */
  async addServerConfig(setId: string, serverId: string, req: NextRequest): Promise<void> {
    try {
      const data = await validateBody(req, serverConfigSchema);
      
      if (this.workspaceId && this.workspaceManager) {
        await this.workspaceManager.tools.addServerConfig(setId, serverId, data);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('not found')) {
        throw new ApiError(
          `Config set not found: ${setId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          (error as Error)
        );
      }
      if ((error as Error).message.includes('already exists')) {
        throw new ApiError(
          `Server already exists in config set: ${setId}/${serverId}`,
          ErrorCode.CONFLICT,
          409,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to add server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates a server config within a config set
   * @param setId Config set ID
   * @param serverId Server ID
   * @param req HTTP request with partial server config data
   */
  async updateServerConfig(setId: string, serverId: string, req: NextRequest): Promise<void> {
    try {
      const data = await validateBody(req, serverConfigSchema.partial());
      
      if (this.workspaceId && this.workspaceManager) {
        await this.workspaceManager.tools.updateServerConfig(setId, serverId, data);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('not found')) {
        throw new ApiError(
          `Server or config set not found: ${setId}/${serverId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to update server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Removes a server config from a config set
   * @param setId Config set ID
   * @param serverId Server ID
   */
  async removeServerConfig(setId: string, serverId: string): Promise<void> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        await this.workspaceManager.tools.removeServerConfig(setId, serverId);
      } else {
        throw new ApiError(
          'System-level tools not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).message.includes('not found')) {
        throw new ApiError(
          `Server or config set not found: ${setId}/${serverId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          404,
          (error as Error)
        );
      }
      throw new ApiError(
        `Failed to remove server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}