import { z } from 'zod';

/**
 * Prompt configuration
 */
export const promptConfigSchema = z.object({
  instructions: z.string(),
  includeWorkspaceMetadata: z.boolean(),
  includeSystemInfo: z.boolean(),
  includeDateTime: z.boolean()
});

export type PromptConfig = z.infer<typeof promptConfigSchema>;