/**
 * Move/rename a file or directory, creating parent directories if needed.
 * Enforces allowedDirs and excludePatterns security boundaries.
 * 
 * excludePatterns are applied to both source and destination paths.
 * Common patterns:
 * - '/\\.' - exclude hidden files/directories anywhere in path
 * - '\\.git/' - exclude .git directories
 * - '\\.env$' - exclude .env files
 */
import { z } from "zod";
import { safeMove } from "../utils/files";
import { RipperError } from "../utils/errors";
import type { SecurityContext } from "../types";
import type { Tool, Context } from "../fastmcp";
import type { ContentResult } from "../fastmcp";

export const MoveFileParams = z.object({
  source: z.string(),
  destination: z.string()
});

type MoveFileResult = {
  source: string;
  destination: string;
  success: boolean;
  error?: string;
};

export function moveFile(securityContext: SecurityContext): Tool<typeof MoveFileParams> {
  return {
    name: "move_file",
    description: "Move or rename files and directories. Can move files between directories and rename them in a single operation. If the destination exists, the operation will fail. Works across different directories and can be used for simple renaming within the same directory. Creates destination parent directories if they don't exist. Both source and destination parameters must use forward slashes (/) regardless of operating system. Both source and destination must be within allowed directories. Returns success status and any errors encountered.",
    parameters: MoveFileParams,
    execute: async (args: z.infer<typeof MoveFileParams>, context: Context): Promise<ContentResult> => {
      try {
        const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));
        await safeMove(args.source, args.destination, securityContext.allowedDirs, excludePatterns);

        const result: MoveFileResult = {
          source: args.source,
          destination: args.destination,
          success: true
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };

      } catch (error) {
        const result: MoveFileResult = {
          source: args.source,
          destination: args.destination,
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