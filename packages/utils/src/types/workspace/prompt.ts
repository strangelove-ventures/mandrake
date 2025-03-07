import { z } from 'zod';

/**
 * Schema for prompt configuration validation
 */
export const promptConfigSchema = z.object({
  instructions: z.string(),
  includeWorkspaceMetadata: z.boolean(),
  includeSystemInfo: z.boolean(),
  includeDateTime: z.boolean()
});

/**
 * Prompt configuration type representing the configuration for prompt generation
 */
export type PromptConfig = z.infer<typeof promptConfigSchema>;