import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { PromptConfig } from '@mandrake/workspace';
import { z } from 'zod';

// Schema for prompt config validation
const promptConfigSchema = z.object({
  instructions: z.string(),
  includeWorkspaceMetadata: z.boolean(),
  includeSystemInfo: z.boolean(),
  includeDateTime: z.boolean()
});

/**
 * Handles prompt operations for both system and workspace levels
 */
export class PromptHandler {
  constructor(
    private workspaceId?: string, 
    private workspaceManager?: WorkspaceManager
  ) {}

  /**
   * Gets the prompt configuration
   * @returns Prompt configuration
   */
  async getConfig(): Promise<PromptConfig> {
    try {
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        return this.workspaceManager.prompt.getConfig();
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level prompt not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to get prompt config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates the prompt configuration
   * @param req HTTP request with prompt configuration
   */
  async updateConfig(req: NextRequest): Promise<void> {
    try {
      const data = await validateBody(req, promptConfigSchema);
      
      if (this.workspaceId && this.workspaceManager) {
        // Workspace-specific implementation
        await this.workspaceManager.prompt.updateConfig(data);
      } else {
        // System-level implementation
        throw new ApiError(
          'System-level prompt not implemented yet',
          ErrorCode.NOT_IMPLEMENTED,
          501
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to update prompt config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  }
}