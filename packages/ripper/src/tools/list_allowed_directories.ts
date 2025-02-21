import { z } from "zod";
import { stat } from "fs/promises";
import { RipperError } from "../utils/errors";
import type { Tool, ContentResult, Context } from "../types";

const ListAllowedDirectoriesParams = z.object({
  allowedDirs: z.array(z.string())
});

type DirectoryInfo = {
  path: string;
  exists: boolean;
  error?: string;
};

type ListAllowedDirectoriesResult = {
  directories: DirectoryInfo[];
};

export const listAllowedDirectories: Tool<typeof ListAllowedDirectoriesParams> = {
  name: "list_allowed_directories",
  description: "List all directories that are allowed to be accessed",
  parameters: ListAllowedDirectoriesParams,
  execute: async (args: z.infer<typeof ListAllowedDirectoriesParams>, context: Context): Promise<ContentResult> => {
    const results: DirectoryInfo[] = await Promise.all(
      args.allowedDirs.map(async (dir) => {
        try {
          const stats = await stat(dir);
          if (!stats.isDirectory()) {
            return {
              path: dir,
              exists: false,
              error: "Path exists but is not a directory"
            };
          }
          return {
            path: dir,
            exists: true
          };
        } catch (error) {
          return {
            path: dir,
            exists: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    const result: ListAllowedDirectoriesResult = {
      directories: results
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }
};