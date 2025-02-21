import { z } from 'zod';
import { WorkspaceTool, ToolResponse, WorkspaceToolError, WorkspaceToolErrorCode } from '../types';

const ModelsParameters = z.object({
  action: z.enum(['add', 'remove', 'enable', 'disable', 'list']),
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  config: z.record(z.unknown()).optional()
});

/**
 * Tool for managing model configurations in a workspace
 */
export const modelsManagementTool: WorkspaceTool = {
  name: 'manage_models',
  description: 'Add, remove, or configure model providers and models',
  parameters: ModelsParameters,

  async execute(args, context): Promise<ToolResponse> {
    const params = ModelsParameters.parse(args);
    const manager = context.workspace.modelManager;

    try {
      switch (params.action) {
        case 'add': {
          if (!params.provider || !params.model) {
            throw new WorkspaceToolError(
              'Provider and model required for adding model configuration',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          const config = {
            ...(params.config || {}),
            ...(params.apiKey ? { apiKey: params.apiKey } : {})
          };

          await manager.addModel(params.provider, params.model, config);
          return {
            success: true,
            message: `Added model configuration: ${params.provider}/${params.model}`
          };
        }

        case 'remove': {
          if (!params.provider || !params.model) {
            throw new WorkspaceToolError(
              'Provider and model required for removing model configuration',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.removeModel(params.provider, params.model);
          return {
            success: true,
            message: `Removed model configuration: ${params.provider}/${params.model}`
          };
        }

        case 'enable': {
          if (!params.provider || !params.model) {
            throw new WorkspaceToolError(
              'Provider and model required for enabling model',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.enableModel(params.provider, params.model);
          return {
            success: true,
            message: `Enabled model: ${params.provider}/${params.model}`
          };
        }

        case 'disable': {
          await manager.disableModel();
          return {
            success: true,
            message: 'Disabled active model'
          };
        }

        case 'list': {
          const models = await manager.listModels();
          return {
            success: true,
            message: 'Retrieved model configurations',
            data: models
          };
        }
      }
    } catch (error) {
      if (error instanceof WorkspaceToolError) {
        throw error;
      }

      throw new WorkspaceToolError(
        `Failed to ${params.action} model configuration: ${error.message}`,
        WorkspaceToolErrorCode.OPERATION_FAILED,
        error
      );
    }
  }
};