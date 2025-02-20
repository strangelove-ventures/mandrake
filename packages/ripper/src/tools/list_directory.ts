import { z } from "zod";
import { readdir, stat } from "fs/promises";
import { RipperError } from "../utils/errors";
import { validatePath } from "../utils/paths";
import { join } from "path";

const ListDirectoryParams = z.object({
  path: z.string(),
  allowedDirs: z.array(z.string())
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

export const listDirectory = {
  name: "list_directory",
  description: "List contents of a directory with FILE/DIR prefixes",
  parameters: ListDirectoryParams,
  execute: async (args: z.infer<typeof ListDirectoryParams>) => {
    try {
      const validPath = await validatePath(args.path, args.allowedDirs);
      const entries = await readdir(validPath);
      
      const items: ListDirectoryItem[] = await Promise.all(
        entries.map(async (entry) => {
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