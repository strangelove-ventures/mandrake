import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sessions } from './sessions';
import { requests } from './requests';
import { responses } from './responses';

export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('sessionId').notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  requestId: text('requestId').unique().notNull()
    .references(() => requests.id),
  responseId: text('responseId').unique().notNull()
    .references(() => responses.id),
  index: integer('index').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  sessionIdIdx: index('idx_rounds_sessionId').on(table.sessionId),
  sessionIndexIdx: index('idx_rounds_sessionIndex').on(table.sessionId, table.index)
}));

export type Round = typeof rounds.$inferSelect;
export type NewRound = typeof rounds.$inferInsert;