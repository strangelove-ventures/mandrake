/**
 * Read one or more files, enforcing allowedDirs and excludePatterns security boundaries.
 * 
 * excludePatterns are applied to the full path, so patterns should account for path separators.
 * Common patterns:
 * - '/\\.' - exclude hidden files/directories anywhere in path
 * - '\\.git/' - exclude .git directories
 * - '\\.env$' - exclude .env files
 */
import { z } from "zod";
import { safeReadFile } from "../utils/files";
import { RipperError } from "../utils/errors";
import type { SecurityContext } from "../types";
import type { Tool, Context } from "../fastmcp";
import type { ContentResult } from "../fastmcp";

export const ReadFilesParams = z.object({
  paths: z.array(z.string())
});

type ReadFileResult = {
  path: string;
  content: string;
  error?: string;
};

export function readFiles(securityContext: SecurityContext): Tool<typeof ReadFilesParams> {
  return {
    name: "read_files",
    description: "Read the contents of one or more files. Accepts an array of file paths and returns their contents as UTF-8 encoded strings. Uses security context to ensure files are within allowed directories. Files must be text-based; binary files may return unexpected results. For PDF and DOCX files, it attempts to extract text content. For large files, content may be truncated.",
    parameters: ReadFilesParams,
    execute: async (args: z.infer<typeof ReadFilesParams>, context: Context): Promise<ContentResult> => {
      const results: ReadFileResult[] = [];
      const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));

      for (const path of args.paths) {
        if (excludePatterns.some(pattern => pattern.test(path))) {
          results.push({
            path,
            content: "",
            error: "Path matches exclude pattern"
          });
          continue;
        }
        try {
          const buf = await safeReadFile(path, securityContext.allowedDirs);
          const content = buf.toString('utf-8');
          results.push({ path, content });
        } catch (error) {
          if (error instanceof RipperError) {
            results.push({ path, content: "", error: error.message });
          } else {
            results.push({
              path,
              content: "",
              error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(results, null, 2)
        }]
      };
    }
  };
}