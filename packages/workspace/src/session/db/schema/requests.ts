import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const requests = sqliteTable('requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text('content').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;