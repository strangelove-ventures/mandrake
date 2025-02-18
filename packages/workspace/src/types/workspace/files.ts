import { z } from 'zod';

export const fileInfoSchema = z.object({
  name: z.string(),
  content: z.string(),
  active: z.boolean().default(true),
});

export type FileInfo = z.infer<typeof fileInfoSchema>;
