import { z } from "zod";
import { RipperError } from "../utils/errors";
import { validatePath } from "../utils/paths";
import { readdir, stat, readFile } from "fs/promises";
import { join, relative } from "path";
import type { Tool, ContentResult, Context } from "../types";

const SearchFilesParams = z.object({
  path: z.string(),
  pattern: z.string(),
  allowedDirs: z.array(z.string()),
  excludePatterns: z.array(z.string()).optional().default([]),
  maxResults: z.number().optional().default(100)
});

type SearchResult = {
  path: string;
  pattern: string;
  matches: string[]; // Just file paths
  error?: string;
};

async function searchInFile(
  filePath: string,
  searchRegex: RegExp
): Promise<boolean> {
  const content = await readFile(filePath, 'utf-8');
  return searchRegex.test(content);
}

async function searchDirectory(
  basePath: string,
  currentPath: string,
  searchRegex: RegExp,
  excludePatterns: RegExp[],
  maxResults: number
): Promise<string[]> {
  const matches: string[] = [];
  const entries = await readdir(currentPath);

  for (const entry of entries) {
    if (matches.length >= maxResults) break;

    const fullPath = join(currentPath, entry);
    const relativePath = relative(basePath, fullPath);

    // Skip if path matches any exclude pattern
    if (excludePatterns.some(pattern => pattern.test(entry))) {
      continue;
    }

    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      const dirMatches = await searchDirectory(
        basePath,
        fullPath,
        searchRegex,
        excludePatterns,
        maxResults - matches.length
      );
      matches.push(...dirMatches);
    } else {
      const hasMatch = await searchInFile(fullPath, searchRegex);
      if (hasMatch) {
        matches.push(fullPath);
      }
    }
  }

  return matches;
}

export const searchFiles: Tool<typeof SearchFilesParams> = {
  name: "search_files",
  description: "Search for files matching a pattern recursively",
  parameters: SearchFilesParams,
  execute: async (args: z.infer<typeof SearchFilesParams>, context: Context): Promise<ContentResult> => {
    try {
      const validPath = await validatePath(args.path, args.allowedDirs);
      
      // Create RegExp objects for search and exclude patterns
      const searchRegex = new RegExp(args.pattern);
      const excludePatterns = args.excludePatterns.map(p => new RegExp(p));

      const matches = await searchDirectory(
        validPath,
        validPath,
        searchRegex,
        excludePatterns,
        args.maxResults
      );

      const result: SearchResult = {
        path: validPath,
        pattern: args.pattern,
        matches
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } catch (error) {
      const result: SearchResult = {
        path: args.path,
        pattern: args.pattern,
        matches: [],
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