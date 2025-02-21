import { z } from "zod";
import { ensureDir } from "../utils/paths";
import { RipperError } from "../utils/errors";
import { stat } from "fs/promises";

const CreateDirectoryParams = z.object({
  path: z.string(),
  allowedDirs: z.array(z.string())
});

type CreateDirectoryResult = {
  path: string;
  success: boolean;
  error?: string;
};

export const createDirectory = {
  name: "create_directory",
  description: "Create a directory and any necessary parent directories",
  parameters: CreateDirectoryParams,
  execute: async (args: z.infer<typeof CreateDirectoryParams>) => {
    try {
      await ensureDir(args.path, args.allowedDirs);

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