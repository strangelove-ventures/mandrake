import { z } from "zod";
import { executeCommand, validateCommand } from "../utils/command";
import { RipperError, ErrorCode } from "../utils/errors";
import type { SecurityContext } from "../types";
import type { Tool, Context, ContentResult } from '../fastmcp';

export const CommandParams = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
});

type CommandResult = {
  stdout: string;
  stderr: string;
  code: number;
  success: boolean;
  error?: string;
};

export function command(securityContext: SecurityContext): Tool<typeof CommandParams> {
  return {
    name: "command",
    description: "Execute a command in a subprocess, with security restrictions on dangerous operations",
    parameters: CommandParams,
    execute: async (args: z.infer<typeof CommandParams>, context: Context): Promise<ContentResult> => {
      try {
        // Validate command for safety first
        validateCommand(args.command);

        // If cwd is specified, make sure it's within allowed directories
        if (args.cwd) {
          const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));
          if (excludePatterns.some(pattern => pattern.test(args.cwd!))) {
            const result: CommandResult = {
              stdout: "",
              stderr: "",
              code: 1,
              success: false,
              error: "Working directory path matches exclude pattern"
            };
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }

          // Check that cwd is within allowed directories
          const isAllowed = securityContext.allowedDirs.some(dir => {
            return args.cwd!.startsWith(dir);
          });

          if (!isAllowed) {
            const result: CommandResult = {
              stdout: "",
              stderr: "",
              code: 1,
              success: false,
              error: "Working directory must be within allowed directories"
            };
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
          }
        }

        // Execute the command
        const commandResult = await executeCommand(args.command, {
          cwd: args.cwd,
          env: args.env
        });

        const result: CommandResult = {
          ...commandResult,
          success: commandResult.code === 0
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const result: CommandResult = {
          stdout: "",
          stderr: "",
          code: 1,
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