import { z } from 'zod';
import { join } from 'path';
import { readFile as fsReadFile } from 'fs/promises';
import type { ToolContext } from '../types';
import { UserError } from 'fastmcp';

// Schema for tool parameters
const schema = z.object({
  path: z.string()
});

export function readFile(ctx: ToolContext) {
  return {
    name: 'read_file',
    description: 'Read the complete contents of a file from the file system. Handles various text encodings and provides detailed error messages if the file cannot be read.',
    parameters: schema,
    execute: async (args) => {
      const { path } = schema.parse(args);
      
      // If workspace path is set, resolve relative to it
      const fullPath = ctx.options.workspacePath 
        ? join(ctx.options.workspacePath, path)
        : path;

      // Check if path is allowed
      if (ctx.options.allowedPaths) {
        const allowed = ctx.options.allowedPaths.some(
          allowedPath => fullPath.startsWith(allowedPath)
        );
        if (!allowed) {
          throw new UserError(`Access to path ${path} is not allowed`);
        }
      }

      try {
        const content = await fsReadFile(fullPath, 'utf-8');
        return content;
      } catch (error) {
        throw new UserError(
          `Failed to read file ${path}: ${(error as Error).message}`
        );
      }
    }
  };
}
