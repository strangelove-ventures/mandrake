import { z } from "zod";
import { safeReadFile } from "../utils/files";
import { join } from "path";
import { RipperError } from "../utils/errors";

const ReadFilesParams = z.object({
  paths: z.array(z.string()),
  allowedDirs: z.array(z.string())
});

type ReadFileResult = {
  path: string;
  content: string;
  error?: string;
};

export const readFiles = {
  name: "read_files",
  description: "Read the contents of one or more files",
  parameters: ReadFilesParams,
  execute: async (args: z.infer<typeof ReadFilesParams>) => {
    const results: ReadFileResult[] = [];

    for (const path of args.paths) {
      try {
        const buf = await safeReadFile(path, args.allowedDirs);
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

    // Return results in FastMCP format
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }
};