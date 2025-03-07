import { z } from "zod";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { RipperError } from "../utils/errors";
import { validatePath } from "../utils/paths";
import type { SecurityContext } from "../types";
import type { Tool, Context } from "../fastmcp";
import type { ContentResult } from "../fastmcp";

export const ListDirectoryParams = z.object({
  path: z.string()
});

type ListDirectoryItem = {
  type: "FILE" | "DIR";
  name: string;
  path: string;
};

type ListDirectoryResult = {
  path: string;
  items: ListDirectoryItem[];
  error?: string;
};

export function listDirectory(securityContext: SecurityContext): Tool<typeof ListDirectoryParams> {
  return {
    name: "list_directory",
    description: "List contents of a directory with FILE/DIR prefixes",
    parameters: ListDirectoryParams,
    execute: async (args: z.infer<typeof ListDirectoryParams>, context: Context): Promise<ContentResult> => {
      try {
        const validPath = await validatePath(args.path, securityContext.allowedDirs);
        const entries = await readdir(validPath);

        // Create RegExp objects for exclude patterns from security context
        const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));

        const items: ListDirectoryItem[] = await Promise.all(
          entries
            .filter(entry => {
              const fullPath = join(validPath, entry);
              return !excludePatterns.some(pattern => pattern.test(fullPath));
            })
            .map(async (entry) => {
              const fullPath = join(validPath, entry);
              const stats = await stat(fullPath);
              return {
                type: stats.isDirectory() ? "DIR" : "FILE",
                name: entry,
                path: fullPath,
              };
            })
        );

        // Sort directories first, then files, both alphabetically
        items.sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === "DIR" ? -1 : 1;
        });

        const result: ListDirectoryResult = {
          path: validPath,
          items
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };

      } catch (error) {
        const result: ListDirectoryResult = {
          path: args.path,
          items: [],
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