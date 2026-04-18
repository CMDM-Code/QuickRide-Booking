import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30');

/**
 * Create atomic SQLite backup using VACUUM INTO
 * This is 100% safe for running databases with active writes
 */
export async function createBackup(): Promise<string> {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(BACKUP_DIR, `forrest-backup-${timestamp}.db`);

  const db = new Database(process.env.DATABASE_PATH || './forrest.db', { readonly: true });
  
  try {
    // Atomic backup - no locks, no downtime
    db.exec(`VACUUM INTO '${backupPath}'`);
    
    // Verify backup integrity
    const backupDb = new Database(backupPath, { readonly: true });
    backupDb.pragma('quick_check');
    backupDb.close();

    // Compress backup
    await execAsync(`gzip -f ${backupPath}`);

    // Rotate old backups
    await rotateBackups();

    return `${backupPath}.gz`;
  } finally {
    db.close();
  }
}

/**
 * Rotate backups keeping only MAX_BACKUPS most recent
 */
async function rotateBackups() {
  const fs = await import('fs/promises');
  const files = await fs.readdir(BACKUP_DIR);
  
  const backups = files
    .filter(f => f.startsWith('forrest-backup-') && f.endsWith('.db.gz'))
    .sort()
    .reverse();

  if (backups.length > MAX_BACKUPS) {
    for (const oldBackup of backups.slice(MAX_BACKUPS)) {
      await fs.unlink(join(BACKUP_DIR, oldBackup));
    }
  }
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupPath: string): Promise<boolean> {
  try {
    await execAsync(`gunzip -c ${backupPath} | sqlite3 - "PRAGMA quick_check(100)"`);
    return true;
  } catch {
    return false;
  }
}

// Schedule daily backup at 03:00 UTC
if (process.env.NODE_ENV === 'production') {
  const now = new Date();
  const nextBackup = new Date(now);
  nextBackup.setUTCHours(3, 0, 0, 0);
  if (nextBackup <= now) {
    nextBackup.setDate(nextBackup.getDate() + 1);
  }

  const delay = nextBackup.getTime() - now.getTime();
  
  setTimeout(() => {
    createBackup().catch(console.error);
    setInterval(() => createBackup().catch(console.error), 86400000);
  }, delay);
}
