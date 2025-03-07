import { z } from 'zod';

/**
 * Schema for refresh configuration validation
 */
export const refreshSchema = z.object({
  enabled: z.boolean(),
  interval: z.string().optional(),
  onDemand: z.boolean().optional()
});

/**
 * Schema for dynamic context method configuration validation
 */
export const dynamicContextMethodSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string(),
  methodName: z.string(),
  params: z.record(z.string(), z.any()),
  refresh: refreshSchema
});

/**
 * Schema for context configuration validation (array of dynamic context methods)
 */
export const contextConfigSchema = z.array(dynamicContextMethodSchema);

/**
 * Dynamic context method configuration type representing a method for context retrieval
 */
export type DynamicContextMethodConfig = z.infer<typeof dynamicContextMethodSchema>;

/**
 * Context configuration type representing a collection of dynamic context methods
 */
export type ContextConfig = z.infer<typeof contextConfigSchema>;