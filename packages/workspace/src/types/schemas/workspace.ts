import { z } from 'zod';

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).regex(/^[a-zA-Z0-9-_]+$/),
  description: z.string().optional(),
  created: z.string().datetime(),
  metadata: z.record(z.string(), z.string())
});

export type Workspace = z.infer<typeof workspaceSchema>;