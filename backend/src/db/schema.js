"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logs = exports.tasks = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.tasks = (0, sqlite_core_1.sqliteTable)('tasks', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    url: (0, sqlite_core_1.text)('url').notNull(),
    interval: (0, sqlite_core_1.text)('interval').notNull().default('*/5 * * * *'), // cron expression
    recipient: (0, sqlite_core_1.text)('recipient').notNull(), // SMS recipient phone number
    lastStatus: (0, sqlite_core_1.text)('last_status'), // e.g., 'AVAILABLE', 'FULL', 'ERROR'
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().default(Date.now()),
});
exports.logs = (0, sqlite_core_1.sqliteTable)('logs', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    taskId: (0, sqlite_core_1.integer)('task_id').references(() => exports.tasks.id),
    message: (0, sqlite_core_1.text)('message').notNull(),
    status: (0, sqlite_core_1.text)('status').notNull(),
    timestamp: (0, sqlite_core_1.integer)('timestamp', { mode: 'timestamp' }).notNull().default(Date.now()),
});
//# sourceMappingURL=schema.js.map