import { NextRequest } from 'next/server';
import { PromptManager } from '@mandrake/workspace';
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
    private promptManager: PromptManager
  ) {}

  /**
   * Gets the prompt configuration
   * @returns Prompt configuration
   */
  async getConfig(): Promise<PromptConfig> {
    try {
      return this.promptManager.getConfig();
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
      await this.promptManager.updateConfig(data);
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