import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const responses = sqliteTable('responses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;