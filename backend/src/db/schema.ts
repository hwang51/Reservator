import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  interval: text('interval').notNull().default('*/5 * * * *'), // cron expression
  recipient: text('recipient').notNull(), // SMS recipient phone number
  lastStatus: text('last_status'), // e.g., 'AVAILABLE', 'FULL', 'ERROR'
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').references(() => tasks.id),
  message: text('message').notNull(),
  status: text('status').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
