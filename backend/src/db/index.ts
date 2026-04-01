import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const dbPath = process.env.DB_PATH || 'data.db';
const sqlite = new Database(dbPath);

// Auto-create tables on first run
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT    NOT NULL,
    interval   TEXT    NOT NULL DEFAULT '*/5 * * * *',
    recipient  TEXT    NOT NULL,
    last_status TEXT,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    INTEGER REFERENCES tasks(id),
    message    TEXT    NOT NULL,
    status     TEXT    NOT NULL,
    timestamp  INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
