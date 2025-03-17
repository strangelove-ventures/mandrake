/**
 * Create a directory and any necessary parent directories.
 * Enforces allowedDirs and excludePatterns security boundaries.
 * 
 * excludePatterns are applied to the full path, so patterns should account for path separators.
 * Common patterns:
 * - '/\\.' - exclude hidden files/directories anywhere in path
 * - '\\.git/' - exclude .git directories
 * - '\\.env$' - exclude .env files
 */
import { z } from "zod";
import { ensureDir } from "../utils/paths";
import { RipperError } from "../utils/errors";
import { stat } from "fs/promises";
import type { SecurityContext } from "../types";
import type { Tool, Context } from "../fastmcp";
import type { ContentResult } from "../fastmcp";

export const CreateDirectoryParams = z.object({
  path: z.string()
});

type CreateDirectoryResult = {
  path: string;
  success: boolean;
  error?: string;
};

export function createDirectory(securityContext: SecurityContext): Tool<typeof CreateDirectoryParams> {
  return {
    name: "create_directory",
    description: "Create a new directory or ensure a directory exists. Creates all necessary parent directories in one operation. If the directory already exists, this operation succeeds silently. Perfect for setting up directory structures for projects or ensuring required paths exist. Path parameter must use forward slashes (/) regardless of operating system. Always use absolute paths or paths relative to the workspace root. Cannot create directories outside allowed directories. Returns success status and any errors encountered.",
    parameters: CreateDirectoryParams,
    execute: async (args: z.infer<typeof CreateDirectoryParams>, context: Context): Promise<ContentResult> => {
      try {
        // Create RegExp objects once
        const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));
        if (excludePatterns.some(pattern => pattern.test(args.path))) {
          const result: CreateDirectoryResult = {
            path: args.path,
            success: false,
            error: "Path matches exclude pattern"
          };
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        }

        await ensureDir(args.path, securityContext.allowedDirs);

        // Add retry logic for stat check
        let stats;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            stats = await stat(args.path);
            break;
          } catch (error) {
            attempts++;
            if (attempts === maxAttempts) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms between attempts
          }
        }

        const result: CreateDirectoryResult = {
          path: args.path,
          success: stats!.isDirectory()
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const result: CreateDirectoryResult = {
          path: args.path,
          success: false,
          error: error instanceof RipperError ?
            error.message :
            `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
    }
  };
}