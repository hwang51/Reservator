import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('data.db');
export const db = drizzle(sqlite, { schema });

// Ensure tables are created (for prototype simplicity, we can use drizzle-kit push)
// But here we'll just export db.
