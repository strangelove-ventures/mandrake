import { z } from 'zod';

export const tokenMetricsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  inputCost: z.number().nonnegative(),
  outputCost: z.number().nonnegative()
});

export type TokenMetrics = z.infer<typeof tokenMetricsSchema>;