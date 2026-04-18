/**
 * Seed script: creates the admin user if it doesn't exist.
 *
 * Usage: QUIZLY_JWT_SECRET=<secret> node seed.js [username] [password]
 * Defaults: admin / admin (change password after first login)
 */

import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { initDatabase, getDb } from './db.js';
import { users } from './schema.js';
import { hashPassword } from './auth.js';

// Initialize DB
initDatabase();
const db = getDb();

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin';

// Check if user already exists
const existing = db.select().from(users).where(eq(users.username, username)).all();

if (existing.length > 0) {
  console.log(`User "${username}" already exists (id: ${existing[0].id})`);
  process.exit(0);
}

const now = new Date().toISOString();
const id = uuidv4();

db.insert(users).values({
  id,
  username,
  passwordHash: hashPassword(password),
  role: 'admin',
  displayName: username.charAt(0).toUpperCase() + username.slice(1),
  createdAt: now,
  updatedAt: now,
}).run();

console.log(`Created admin user "${username}" (id: ${id})`);
console.log('Change the password after first login!');
