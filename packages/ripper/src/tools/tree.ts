import { z } from "zod";
import { RipperError } from "../utils/errors";
import { validatePath } from "../utils/paths";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import type { Tool, ContentResult, Context } from "../types";

const TreeParams = z.object({
  path: z.string(),
  allowedDirs: z.array(z.string()),
  depth: z.number().optional().default(Infinity)
});

type TreeNode = {
  type: "file" | "directory";
  name: string;  
  path: string;
  children?: TreeNode[];
};

type TreeResult = {
  path: string;
  tree: TreeNode;
  error?: string;
};

async function buildTree(path: string, depth: number = Infinity, currentDepth: number = 0): Promise<TreeNode> {
  const stats = await stat(path);
  const name = path.split("/").pop() || path;
  
  if (!stats.isDirectory() || currentDepth >= depth) {
    return {
      type: "file",
      name,
      path
    };
  }

  const entries = await readdir(path);
  const children = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(path, entry);
      return buildTree(fullPath, depth, currentDepth + 1);
    })
  );

  // Sort children: directories first, then files, both alphabetically
  children.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "directory" ? -1 : 1;
  });

  return {
    type: "directory",
    name,
    path,
    children
  };
}

export const tree: Tool<typeof TreeParams> = {
  name: "tree",
  description: "Generate a tree visualization of a directory structure",
  parameters: TreeParams,
  execute: async (args: z.infer<typeof TreeParams>, context: Context): Promise<ContentResult> => {
    try {
      const validPath = await validatePath(args.path, args.allowedDirs);
      const tree = await buildTree(validPath, args.depth);

      const result: TreeResult = {
        path: validPath,
        tree
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } catch (error) {
      const result: TreeResult = {
        path: args.path,
        tree: {
          type: "directory",
          name: args.path.split("/").pop() || args.path,
          path: args.path
        },
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