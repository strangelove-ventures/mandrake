import { z } from 'zod';
import { WorkspaceTool, ToolResponse, WorkspaceToolError, WorkspaceToolErrorCode } from '../types';

// Schema for dynamic context actions
const DynamicContextParameters = z.object({
  action: z.enum(['add', 'remove', 'update', 'list']),
  name: z.string().optional(),
  command: z.string().optional(),
  enabled: z.boolean().optional()
});

/**
 * Tool for managing dynamic context in a workspace
 */
export const dynamicContextTool: WorkspaceTool = {
  name: 'manage_dynamic_context',
  description: 'Add, remove, or update dynamic context configuration',
  parameters: DynamicContextParameters,

  async execute(args, context): Promise<ToolResponse> {
    const params = DynamicContextParameters.parse(args);
    const manager = context.workspace.dynamicContextManager;

    try {
      switch (params.action) {
        case 'add': {
          if (!params.name || !params.command) {
            throw new WorkspaceToolError(
              'Name and command required for adding dynamic context',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.create({
            name: params.name,
            command: params.command,
            enabled: params.enabled ?? true
          });

          return {
            success: true,
            message: `Added dynamic context: ${params.name}`
          };
        }

        case 'remove': {
          if (!params.name) {
            throw new WorkspaceToolError(
              'Name required for removing dynamic context',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.delete(params.name);
          
          return {
            success: true,
            message: `Removed dynamic context: ${params.name}`
          };
        }

        case 'update': {
          if (!params.name) {
            throw new WorkspaceToolError(
              'Name required for updating dynamic context',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          const updates: Record<string, unknown> = {};
          if (params.command) updates.command = params.command;
          if (typeof params.enabled !== 'undefined') updates.enabled = params.enabled;

          if (Object.keys(updates).length === 0) {
            throw new WorkspaceToolError(
              'No updates provided',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.update(params.name, updates);

          return {
            success: true,
            message: `Updated dynamic context: ${params.name}`
          };
        }

        case 'list': {
          const contexts = await manager.list();
          return {
            success: true,
            message: 'Retrieved dynamic contexts',
            data: contexts
          };
        }

        default: {
          throw new WorkspaceToolError(
            `Invalid action: ${params.action}`,
            WorkspaceToolErrorCode.INVALID_PARAMETERS
          );
        }
      }
    } catch (error) {
      // Convert known errors or wrap unknown ones
      if (error instanceof WorkspaceToolError) {
        throw error;
      }

      throw new WorkspaceToolError(
        `Failed to ${params.action} dynamic context: ${error.message}`,
        WorkspaceToolErrorCode.OPERATION_FAILED,
        error
      );
    }
  }
};