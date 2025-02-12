import { z } from 'zod';
import { tokenMetricsSchema } from './metrics';

export const turnToolCallSchema = z.object({
  call: z.any(),  // TODO: Type this based on MCP implementation
  result: z.any()
});

export const turnSchema = z.object({
  id: z.string().uuid(),
  responseId: z.string().uuid(),
  index: z.number().int().nonnegative(),
  rawResponse: z.string(),
  content: z.array(z.string()),
  toolCalls: z.array(turnToolCallSchema),
  metrics: tokenMetricsSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Turn = z.infer<typeof turnSchema>;