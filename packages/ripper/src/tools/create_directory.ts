import { z } from "zod";
import { ensureDir } from "../utils/files";
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
      await ensureDir(args.path, args.allowedDirs, true);

      // Verify directory was created
      const stats = await stat(args.path);
      const result: CreateDirectoryResult = {
        path: args.path,
        success: stats.isDirectory()  // Verify it's actually a directory
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