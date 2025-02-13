import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sessions } from './sessions';
import { requests } from './requests';
import { responses } from './responses';

export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  requestId: text('request_id').unique().notNull()
    .references(() => requests.id),
  responseId: text('response_id').unique().notNull()
    .references(() => responses.id),
  index: integer('index').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  sessionIdIdx: index('idx_rounds_session_id').on(table.sessionId),
  sessionIndexIdx: index('idx_rounds_session_index').on(table.sessionId, table.index)
}));

export type Round = typeof rounds.$inferSelect;
export type NewRound = typeof rounds.$inferInsert;