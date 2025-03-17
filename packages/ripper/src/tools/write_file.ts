import { z } from "zod";
import { safeWriteFile } from "../utils/files";
import { RipperError } from "../utils/errors";
import type { SecurityContext } from "../types";
import type { Tool, Context, ContentResult } from '../fastmcp'

export const WriteFileParams = z.object({
  path: z.string(),
  content: z.string()
});

type WriteFileResult = {
  path: string;
  success: boolean;
  error?: string;
};

export function writeFile(securityContext: SecurityContext): Tool<typeof WriteFileParams> {
  return {
    name: "write_file",
    description: "Write content to a file, creating parent directories if needed. This tool will completely replace the contents of an existing file or create a new file. Always provide the complete intended file contents - partial updates are not supported. Paths must use forward slashes (/) regardless of the operating system. Always provide absolute paths or paths relative to the workspace root directory. If the directory structure doesn't exist, it will be created automatically. Returns success status and any errors encountered.",
    parameters: WriteFileParams,
    execute: async (args: z.infer<typeof WriteFileParams>, context: Context): Promise<ContentResult> => {
      const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));
      if (excludePatterns.some(pattern => pattern.test(args.path))) {
        const result: WriteFileResult = {
          path: args.path,
          success: false,
          error: "Path matches exclude pattern"
        };
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      try {
        await safeWriteFile(args.path, args.content, securityContext.allowedDirs);
        const result: WriteFileResult = { path: args.path, success: true };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const result: WriteFileResult = {
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
  }
};