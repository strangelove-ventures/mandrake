import { z } from 'zod';
import { WorkspaceTool, ToolResponse, WorkspaceToolError, WorkspaceToolErrorCode } from '../types';

const FilesParameters = z.object({
  action: z.enum(['add', 'remove', 'update', 'list', 'read']),
  path: z.string().optional(),
  content: z.string().optional()
});

/**
 * Tool for managing files in a workspace
 */
export const filesManagementTool: WorkspaceTool = {
  name: 'manage_files',
  description: 'Add, remove, update, or list files in the workspace',
  parameters: FilesParameters,

  async execute(args, context): Promise<ToolResponse> {
    const params = FilesParameters.parse(args);
    const manager = context.workspace.filesManager;

    try {
      switch (params.action) {
        case 'add': {
          if (!params.path || !params.content) {
            throw new WorkspaceToolError(
              'Path and content required for adding files',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.writeFile(params.path, params.content);
          return {
            success: true,
            message: `Created file: ${params.path}`
          };
        }

        case 'remove': {
          if (!params.path) {
            throw new WorkspaceToolError(
              'Path required for removing files',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.deleteFile(params.path);
          return {
            success: true,
            message: `Removed file: ${params.path}`
          };
        }

        case 'update': {
          if (!params.path || !params.content) {
            throw new WorkspaceToolError(
              'Path and content required for updating files',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          await manager.writeFile(params.path, params.content);
          return {
            success: true,
            message: `Updated file: ${params.path}`
          };
        }

        case 'read': {
          if (!params.path) {
            throw new WorkspaceToolError(
              'Path required for reading files',
              WorkspaceToolErrorCode.INVALID_PARAMETERS
            );
          }

          const content = await manager.readFile(params.path);
          return {
            success: true,
            message: `Read file: ${params.path}`,
            data: { content }
          };
        }

        case 'list': {
          const files = await manager.listFiles();
          return {
            success: true,
            message: 'Retrieved file list',
            data: files
          };
        }
      }
    } catch (error) {
      if (error instanceof WorkspaceToolError) {
        throw error;
      }

      throw new WorkspaceToolError(
        `Failed to ${params.action} file: ${error.message}`,
        WorkspaceToolErrorCode.OPERATION_FAILED,
        error
      );
    }
  }
};