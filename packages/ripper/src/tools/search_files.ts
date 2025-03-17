/**
 * Search for files matching a pattern recursively.
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
import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";
import type { Tool, Context, ContentResult } from "../fastmcp";
import type { SecurityContext } from "../types";

export const SearchFilesParams = z.object({
  path: z.string(),
  pattern: z.string(),
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

    // Check the full path against exclude patterns, not just the entry name
    if (excludePatterns.some(pattern => pattern.test(fullPath))) {
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

export function searchFiles(securityContext: SecurityContext): Tool<typeof SearchFilesParams> {
  return {
    name: "search_files",
    description: "Recursively search for files containing text that matches a regex pattern in a specified directory. Searches through all subdirectories from the starting path. Provide a regex pattern that will be used to search file contents (not just filenames). Returns a list of file paths containing matches. The search is case-sensitive by default (use (?i) for case-insensitive search). The maxResults parameter limits the total number of matching files returned (default 100). Always use forward slashes (/) in the path parameter regardless of the operating system. Uses security context to ensure searches are within allowed directories.",
    parameters: SearchFilesParams,
    execute: async (args: z.infer<typeof SearchFilesParams>, context: Context): Promise<ContentResult> => {
      try {
        const validPath = await validatePath(args.path, securityContext.allowedDirs);

        // Create RegExp objects for search and exclude patterns
        const searchRegex = new RegExp(args.pattern);
        const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));

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
}