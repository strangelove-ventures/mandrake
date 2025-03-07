import { z } from 'zod';

/**
 * Schema for tool calls used in the session coordinator
 */
export const toolCallSchema = z.object({
  call: z.object({
    serverName: z.string(),
    methodName: z.string(),
    arguments: z.record(z.any())
  }).nullable(),
  response: z.any().nullable()
});

/**
 * Tool call type representing a tool call in a session
 */
export type ToolCall = z.infer<typeof toolCallSchema>;