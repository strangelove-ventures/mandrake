import { z } from "zod";
import { safeWriteFile } from "../utils/files";
import { RipperError } from "../utils/errors";

const WriteFileParams = z.object({
  path: z.string(),
  content: z.string(),
  allowedDirs: z.array(z.string())
});

type WriteFileResult = {
  path: string;
  success: boolean;
  error?: string;
};

export const writeFile = {
  name: "write_file",
  description: "Write content to a file, creating parent directories if needed",
  parameters: WriteFileParams,
  execute: async (args: z.infer<typeof WriteFileParams>) => {
    try {
      await safeWriteFile(args.path, args.content, args.allowedDirs);
      const result: WriteFileResult = { path: args.path, success: true };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
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
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  }
};