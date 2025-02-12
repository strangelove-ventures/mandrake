import { z } from 'zod';
import { turnSchema, type Turn } from './turn';

export const requestSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const responseSchema = z.object({
  id: z.string().uuid(),
  turns: z.array(turnSchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const roundSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  requestId: z.string().uuid(),
  request: requestSchema.optional(),
  responseId: z.string().uuid(),
  response: responseSchema.optional(),
  index: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Request = z.infer<typeof requestSchema>;
export type Response = z.infer<typeof responseSchema>;
export type Round = z.infer<typeof roundSchema>;