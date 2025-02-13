import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { responses } from './responses';

export const turns = sqliteTable('turns', {
  // Core turn fields
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  responseId: text('response_id').notNull()
    .references(() => responses.id, { onDelete: 'cascade' }),
  index: integer('index').notNull(),

  // Content fields
  rawResponse: text('raw_response').notNull(),
  content: text('content').notNull(), // JSON array of strings
  toolCalls: text('tool_calls').notNull(), // JSON array of {call, result}

  // Streaming status fields
  status: text('status', { enum: ['streaming', 'completed', 'error'] }).notNull().default('streaming'),
  streamStartTime: integer('stream_start_time').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  streamEndTime: integer('stream_end_time'),
  currentTokens: integer('current_tokens').notNull().default(0),
  expectedTokens: integer('expected_tokens'),

  // Token metrics
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cacheReadTokens: integer('cache_read_tokens'),
  cacheWriteTokens: integer('cache_write_tokens'),
  inputCost: real('input_cost').notNull(),
  outputCost: real('output_cost').notNull(),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  responseIdIdx: index('idx_turns_response_id').on(table.responseId),
  responseIndexIdx: index('idx_turns_response_index').on(table.responseId, table.index),
  activeStreamsIdx: index('idx_active_streams').on(table.responseId).where(sql`status = 'streaming'`)
}));

export type Turn = typeof turns.$inferSelect;
export type NewTurn = typeof turns.$inferInsert;