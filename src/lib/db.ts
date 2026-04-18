import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

// Use temporary database that works in sandbox environments
const db = new Database(':memory:');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

export const dbService = {
  createUser: (name: string, email: string, password: string) => {
    const hashedPassword = bcrypt.hashSync(password, 8);
    const id = crypto.randomUUID();
    
    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, email, hashedPassword, new Date().toISOString());
      
      return { id, name, email };
    } catch (e) {
      return null;
    }
  },

  verifyUser: (email: string, password: string) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user) return null;
    
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) return null;
    
    const { password: _, ...userData } = user;
    return userData;
  },

  getUserByEmail: (email: string) => {
    return db.prepare('SELECT id, name, email, created_at FROM users WHERE email = ?').get(email);
  },

  getUserById: (id: string) => {
    return db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(id);
  }
};
