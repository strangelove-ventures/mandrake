import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { responses } from './responses';
import { z } from 'zod';

// Define the schema for tool calls
// The schema matches the format used in the session coordinator
export const toolCallSchema = z.object({
  call: z.object({
    serverName: z.string(),
    methodName: z.string(),
    arguments: z.record(z.any())
  }).nullable(),
  response: z.any().nullable()
});

export type ToolCall = z.infer<typeof toolCallSchema>;

export const turns = sqliteTable('turns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  responseId: text('responseId').notNull()
    .references(() => responses.id, { onDelete: 'cascade' }),
  index: integer('index').notNull(),

  // Content fields
  rawResponse: text('rawResponse').notNull(),
  content: text('content').notNull(),
  toolCalls: text('toolCalls').notNull(),

  // Streaming status fields
  status: text('status', { enum: ['streaming', 'completed', 'error'] }).notNull().default('streaming'),
  streamStartTime: integer('streamStartTime').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  streamEndTime: integer('streamEndTime').$defaultFn(() => Math.floor(Date.now() / 1000)),
  currentTokens: integer('currentTokens').notNull().default(0),
  expectedTokens: integer('expectedTokens'),

  // Token metrics
  inputTokens: integer('inputTokens').notNull(),
  outputTokens: integer('outputTokens').notNull(),
  cacheReadTokens: integer('cacheReadTokens'),
  cacheWriteTokens: integer('cacheWriteTokens'),
  inputCost: real('inputCost').notNull(),
  outputCost: real('outputCost').notNull(),

  // Timestamps
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  responseIdIdx: index('idx_turns_responseId').on(table.responseId),
  responseIndexIdx: index('idx_turns_responseIndex').on(table.responseId, table.index),
  activeStreamsIdx: index('idx_activeStreams').on(table.responseId).where(sql`status = 'streaming'`)
}));

export type Turn = typeof turns.$inferSelect;
export type NewTurn = typeof turns.$inferInsert;