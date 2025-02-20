import { z } from "zod";
import { RipperError } from "../utils/errors";
import { validatePath } from "../utils/paths";
import { readdir, stat, readFile } from "fs/promises";
import { join, relative } from "path";

const SearchFilesParams = z.object({
  path: z.string(),
  pattern: z.string(),
  allowedDirs: z.array(z.string()),
  excludePatterns: z.array(z.string()).optional().default([]),
  maxResults: z.number().optional().default(100)
});

type SearchMatch = {
  path: string;
  line: number;
  content: string;
  match: string;
};

type SearchResult = {
  path: string;
  pattern: string;
  matches: SearchMatch[];
  error?: string;
};

async function searchInFile(
  filePath: string, 
  searchRegex: RegExp, 
  maxResults: number
): Promise<SearchMatch[]> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: SearchMatch[] = [];

  for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
    const line = lines[i];
    const match = line.match(searchRegex);
    if (match) {
      matches.push({
        path: filePath,
        line: i + 1,
        content: line,
        match: match[0]
      });
    }
  }

  return matches;
}

async function searchDirectory(
  basePath: string,
  currentPath: string,
  searchRegex: RegExp,
  excludePatterns: RegExp[],
  maxResults: number
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  const entries = await readdir(currentPath);

  for (const entry of entries) {
    if (matches.length >= maxResults) break;

    const fullPath = join(currentPath, entry);
    const relativePath = relative(basePath, fullPath);

    // Check if path matches any exclude patterns
    if (excludePatterns.some(pattern => pattern.test(relative(basePath, fullPath)))) {
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
      const fileMatches = await searchInFile(
        fullPath,
        searchRegex,
        maxResults - matches.length
      );
      matches.push(...fileMatches);
    }
  }

  return matches;
}

export const searchFiles = {
  name: "search_files",
  description: "Search for files matching a pattern recursively",
  parameters: SearchFilesParams,
  execute: async (args: z.infer<typeof SearchFilesParams>) => {
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