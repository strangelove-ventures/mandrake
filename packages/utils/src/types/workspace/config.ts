import { z } from 'zod';

/**
 * Schema for registered workspace validation
 */
export const registeredWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/),
  path: z.string(),
  description: z.string().optional(),
  lastOpened: z.string().datetime().optional(),
});

/**
 * Schema for mandrake configuration validation
 */
export const mandrakeConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  telemetry: z.boolean(),
  metadata: z.record(z.string(), z.string()),
  workspaces: z.array(registeredWorkspaceSchema).default([]).optional()
});

/**
 * Registered workspace type representing a workspace entry in the mandrake config
 */
export type RegisteredWorkspace = z.infer<typeof registeredWorkspaceSchema>;

/**
 * Mandrake configuration type representing the global configuration
 */
export type MandrakeConfig = z.infer<typeof mandrakeConfigSchema>;