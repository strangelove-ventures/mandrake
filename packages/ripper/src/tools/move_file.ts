import { z } from "zod";
import { safeMove } from "../utils/files";
import { RipperError } from "../utils/errors";
import type { Tool, ContentResult, Context } from "../types";

const MoveFileParams = z.object({
  source: z.string(),
  destination: z.string(),
  allowedDirs: z.array(z.string())
});

type MoveFileResult = {
  source: string;
  destination: string;
  success: boolean;
  error?: string;
};

export const moveFile: Tool<typeof MoveFileParams> = {
  name: "move_file",
  description: "Move/rename a file or directory, creating parent directories if needed",
  parameters: MoveFileParams,
  execute: async (args: z.infer<typeof MoveFileParams>, context: Context): Promise<ContentResult> => {
    try {
      await safeMove(args.source, args.destination, args.allowedDirs);
      
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