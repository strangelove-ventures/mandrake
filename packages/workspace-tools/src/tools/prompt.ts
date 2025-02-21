import { z } from 'zod';
import { WorkspaceTool, ToolResponse, WorkspaceToolError, WorkspaceToolErrorCode } from '../types';

const PromptParameters = z.object({
  action: z.enum(['get', 'update']),
  prompt: z.string().optional()
});

/**
 * Tool for managing system prompts in a workspace
 */
export const promptManagementTool: WorkspaceTool = {
  name: 'manage_prompt',
  description: 'Get or update the system prompt for this workspace',
  parameters: PromptParameters,

  async execute(args, context): Promise<ToolResponse> {
    const params = PromptParameters.parse(args);
    const manager = context.workspace.promptManager;

    try {
      switch (params.action) {
        case 'get': {
          const prompt = await manager.getPrompt();
          return {
            success: true,
            message: 'Retrieved system prompt',
            data: { prompt }
          };
        }

        case 'update': {
          if (!params.prompt) {
            throw new WorkspaceToolError(
              'Prompt required for update',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.setPrompt(params.prompt);
          return {
            success: true,
            message: 'Updated system prompt'
          };
        }
      }
    } catch (error) {
      if (error instanceof WorkspaceToolError) {
        throw error;
      }

      throw new WorkspaceToolError(
        `Failed to ${params.action} system prompt: ${error.message}`,
        WorkspaceToolErrorCode.OPERATION_FAILED,
        error
      );
    }
  }
};