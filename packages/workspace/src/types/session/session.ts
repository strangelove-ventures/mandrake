import { z } from 'zod';
import { roundSchema } from './round';

export const sessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  workspaceId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).default({}),
  rounds: z.array(roundSchema).optional(), 
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Session = z.infer<typeof sessionSchema>;