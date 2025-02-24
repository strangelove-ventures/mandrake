import { z } from "zod";
import { stat } from "fs/promises";
import type { SecurityContext } from "../types";
import type { Tool, Context } from "../fastmcp";
import type { ContentResult } from "../fastmcp";

export type DirectoryInfo = {
  path: string;
  exists: boolean;
  excludePatterns: string[];
  error?: string;
};

export type ListAllowedDirectoriesResult = {
  directories: DirectoryInfo[];
};

export const ListAllowedDirectoriesParams = z.object({});

export function listAllowedDirectories(securityContext: SecurityContext): Tool<typeof ListAllowedDirectoriesParams> {
  return {
    name: "list_allowed_directories",
    description: "List all directories that are allowed to be accessed",
    parameters: ListAllowedDirectoriesParams,
    execute: async (args: z.infer<typeof ListAllowedDirectoriesParams>, context: Context): Promise<ContentResult> => {
      const results: DirectoryInfo[] = await Promise.all(
        securityContext.allowedDirs.map(async (dir) => {
          try {
            const stats = await stat(dir);
            if (!stats.isDirectory()) {
              return {
                path: dir,
                exists: false,
                excludePatterns: securityContext.excludePatterns,
                error: "Path exists but is not a directory"
              };
            }
            return {
              path: dir,
              exists: true,
              excludePatterns: securityContext.excludePatterns
            };
          } catch (error) {
            return {
              path: dir,
              exists: false,
              excludePatterns: securityContext.excludePatterns,
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
}