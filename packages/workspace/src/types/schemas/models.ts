import { z } from 'zod';

export const modelsConfigSchema = z.object({
  provider: z.string(),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  maxTokens: z.number().positive().int(),
  temperature: z.number().min(0).max(1)
});

export type ModelsConfig = z.infer<typeof modelsConfigSchema>;