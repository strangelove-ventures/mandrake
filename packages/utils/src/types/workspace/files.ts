import { z } from 'zod';

/**
 * Schema for file information validation
 */
export const fileInfoSchema = z.object({
  name: z.string(),
  content: z.string(),
  active: z.boolean().default(true),
});

/**
 * File information type representing a file in the workspace
 */
export type FileInfo = z.infer<typeof fileInfoSchema>;