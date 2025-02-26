import { z } from 'zod';

export const registeredWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/),
  path: z.string(),
  description: z.string().optional(),
  lastOpened: z.string().datetime().optional(),
});

export const mandrakeConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  telemetry: z.boolean(),
  metadata: z.record(z.string(), z.string()),
  workspaces: z.array(registeredWorkspaceSchema).default([])
});

export type RegisteredWorkspace = z.infer<typeof registeredWorkspaceSchema>;
export type MandrakeConfig = z.infer<typeof mandrakeConfigSchema>;