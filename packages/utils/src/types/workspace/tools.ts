import { z } from 'zod';

/**
 * Schema for server configuration validation
 */
export const serverConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  autoApprove: z.array(z.string()).optional(),
  disabled: z.boolean().optional(),
});

/**
 * Schema for tool configuration validation (collection of server configs)
 */
export const toolConfigSchema = z.record(z.string(), serverConfigSchema);

/**
 * Schema for tools configuration validation (named collection of tool configs with active one)
 */
export const toolsConfigSchema = z.object({
  active: z.string(),
  configs: z.record(z.string(), toolConfigSchema),
});

/**
 * Server configuration type representing a server for tool execution
 */
export type ServerConfig = z.infer<typeof serverConfigSchema>;

/**
 * Tool configuration type representing a collection of server configurations
 */
export type ToolConfig = z.infer<typeof toolConfigSchema>;

/**
 * Tools configuration type representing active tool and available tool configurations
 */
export type ToolsConfig = z.infer<typeof toolsConfigSchema>;