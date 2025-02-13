import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title'),
  description: text('description'),
  workspaceId: text('workspaceId'),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  workspaceIdx: index('idx_sessions_workspaceId').on(table.workspaceId)
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;