import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const gateway = sqliteTable('gateway', {id:text('id').primaryKey(),contents:text('contents').notNull(),version:integer('version').notNull().default(1)});
