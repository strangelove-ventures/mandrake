import { z } from 'zod';

// Core server config schema
export const serverConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  autoApprove: z.array(z.string()).optional(),
  disabled: z.boolean().optional(),
});

// A tool config is a collection of named server configs
export const toolConfigSchema = z.record(z.string(), serverConfigSchema);

// Tools config is a named collection of tool configs with an active one
export const toolsConfigSchema = z.object({
  active: z.string(),
  configs: z.record(z.string(), toolConfigSchema),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type ToolConfig = z.infer<typeof toolConfigSchema>;
export type ToolsConfig = z.infer<typeof toolsConfigSchema>;
