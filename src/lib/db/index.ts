import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_PATH || './forrest.db', {
  readonly: false,
  fileMustExist: false,
});

// Enable Write-Ahead Logging for maximum concurrency and performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -20000'); // 20MB cache
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('temp_store = MEMORY');
sqlite.pragma('mmap_size = 30000000000'); // 30GB memory map
sqlite.pragma('page_size = 4096');

export const db = drizzle(sqlite, { schema });

// Initialize default super admin on first run
const existingAdmins = db.select().from(schema.adminUsers).limit(1).all();
if (existingAdmins.length === 0) {
  db.insert(schema.adminUsers).values({
    id: 'USR-ADMIN001',
    email: 'admin@quickridebooking.com',
    name: 'System Administrator',
    role: 'super_admin',
    status: 'active',
  }).run();
}
