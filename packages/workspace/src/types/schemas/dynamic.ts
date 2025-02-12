import { z } from 'zod';

export const refreshSchema = z.object({
  enabled: z.boolean(),
  interval: z.string().optional(),
  onDemand: z.boolean().optional()
});

export const dynamicContextMethodSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string(),
  methodName: z.string(),
  params: z.record(z.string(), z.any()),
  refresh: refreshSchema
});

export const contextConfigSchema = z.array(dynamicContextMethodSchema);

export type DynamicContextMethodConfig = z.infer<typeof dynamicContextMethodSchema>;
export type ContextConfig = z.infer<typeof contextConfigSchema>;