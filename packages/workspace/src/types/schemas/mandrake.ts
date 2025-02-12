import { z } from 'zod';

export const mandrakeConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  telemetry: z.boolean(),
  metadata: z.record(z.string(), z.string())
});

export type MandrakeConfig = z.infer<typeof mandrakeConfigSchema>;