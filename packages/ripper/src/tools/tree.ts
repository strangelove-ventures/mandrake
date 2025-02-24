/**
 * Generate a tree visualization of a directory structure.
 * Enforces allowedDirs and excludePatterns security boundaries.
 * 
 * excludePatterns are applied to the full path, so patterns should account for path separators.
 * Common patterns:
 * - '/\\.' - exclude hidden files/directories anywhere in path
 * - '\\.git/' - exclude .git directories
 * - '\\.env$' - exclude .env files
 */
import { z } from "zod";
import { RipperError } from "../utils/errors";
import { validatePath } from "../utils/paths";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import type { SecurityContext } from "../types";
import type { Tool, Context, ContentResult } from "../fastmcp";

export const TreeParams = z.object({
  path: z.string(),
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

async function buildTree(
  path: string,
  excludePatterns: RegExp[],
  depth: number = Infinity,
  currentDepth: number = 0
): Promise<TreeNode> {
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

  // Filter entries using exclude patterns against full path
  const filteredEntries = entries.filter(entry => {
    const fullPath = join(path, entry);
    return !excludePatterns.some(pattern => pattern.test(fullPath));
  });

  const children = await Promise.all(
    filteredEntries.map(async (entry) => {
      const fullPath = join(path, entry);
      return buildTree(fullPath, excludePatterns, depth, currentDepth + 1);
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

export function tree(securityContext: SecurityContext): Tool<typeof TreeParams> {
  return {
    name: "tree",
    description: "Generate a tree visualization of a directory structure",
    parameters: TreeParams,
    execute: async (args: z.infer<typeof TreeParams>, context: Context): Promise<ContentResult> => {
      try {
        const validPath = await validatePath(args.path, securityContext.allowedDirs);
        const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));
        const tree = await buildTree(validPath, excludePatterns, args.depth);

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
}