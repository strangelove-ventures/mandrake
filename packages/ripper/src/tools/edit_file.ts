/**
 * Edit a file using search/replace operations and return a git-style diff.
 * Enforces allowedDirs and excludePatterns security boundaries.
 * 
 * excludePatterns are applied to the full path, so patterns should account for path separators.
 * Common patterns:
 * - '/\\.' - exclude hidden files/directories anywhere in path
 * - '\\.git/' - exclude .git directories
 * - '\\.env$' - exclude .env files
 */
import { z } from "zod";
import { safeReadFile, safeWriteFile } from "../utils/files";
import { RipperError, ErrorCode } from "../utils/errors";
import type { SecurityContext } from "../types";
import type { Tool, Context } from "../fastmcp";
import type { ContentResult } from "../fastmcp";

export const EditParams = z.object({
  path: z.string(),
  edits: z.array(z.object({
    oldText: z.string(),
    newText: z.string()
  })),
  dryRun: z.boolean().optional().default(false)
});

type EditResult = {
  path: string;
  success: boolean;
  diff?: string;
  error?: string;
};

function generateDiff(original: Buffer, edited: Buffer, path: string): string {
  const originalText = original.toString('utf-8');
  const editedText = edited.toString('utf-8');
  const originalLines = originalText.split('\n');
  const editedLines = editedText.split('\n');
  let diff = `--- ${path}\n+++ ${path}\n`;

  let i = 0;
  let j = 0;

  while (i < originalLines.length || j < editedLines.length) {
    if (i < originalLines.length && j < editedLines.length && originalLines[i] === editedLines[j]) {
      diff += ` ${originalLines[i]}\n`;
      i++;
      j++;
    } else if (i < originalLines.length && (j >= editedLines.length || originalLines[i] !== editedLines[j])) {
      diff += `-${originalLines[i]}\n`;
      i++;
    } else if (j < editedLines.length && (i >= originalLines.length || originalLines[i] !== editedLines[j])) {
      diff += `+${editedLines[j]}\n`;
      j++;
    }
  }

  return diff;
}

export function editFile(securityContext: SecurityContext): Tool<typeof EditParams> {
  return {
    name: "edit_file",
    description: "Edit a file using search/replace operations and return a git-style diff",
    parameters: EditParams,
    execute: async (args: z.infer<typeof EditParams>, context: Context): Promise<ContentResult> => {
      try {
        const excludePatterns = securityContext.excludePatterns.map(p => new RegExp(p));
        if (excludePatterns.some(pattern => pattern.test(args.path))) {
          const result: EditResult = {
            path: args.path,
            success: false,
            error: "Path matches exclude pattern"
          };
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        }

        // Read original content
        const originalContent = await safeReadFile(args.path, securityContext.allowedDirs);
        const originalText = originalContent.toString('utf-8');

        // Apply edits
        let editedText = originalText;
        for (const edit of args.edits) {
          if (!editedText.includes(edit.oldText)) {
            throw new RipperError(
              `Could not find text to replace: ${edit.oldText}`,
              'EDIT_ERROR' as ErrorCode
            );
          }
          editedText = editedText.replaceAll(edit.oldText, edit.newText);
        }

        const editedContent = Buffer.from(editedText, 'utf-8');

        // Generate diff
        const diff = generateDiff(originalContent, editedContent, args.path);

        // If dry run, just return the diff
        if (args.dryRun) {
          const result: EditResult = {
            path: args.path,
            success: true,
            diff
          };
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        }

        // Write changes
        await safeWriteFile(args.path, editedText, securityContext.allowedDirs);

        const result: EditResult = {
          path: args.path,
          success: true,
          diff
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };

      } catch (error) {
        const result: EditResult = {
          path: args.path,
          success: false,
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