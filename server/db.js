/**
 * Database initialization and access for Quizly Sync Server.
 *
 * SQLite + Drizzle ORM, WAL mode, foreign keys.
 * Mirrors shredly's db.ts pattern.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';

let _db = null;
let _sqlite = null;

const DEFAULT_DB_PATH = resolve('data', 'quizly.db');

/**
 * Initialize the database connection and create tables if they don't exist.
 * Idempotent — safe to call multiple times.
 */
export function initDatabase(dbPath) {
  if (_db) return _db;

  const resolvedPath = dbPath ?? process.env.QUIZLY_DB_PATH ?? DEFAULT_DB_PATH;

  // Ensure data directory exists
  if (resolvedPath !== ':memory:') {
    const dir = resolve(resolvedPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  _sqlite = new Database(resolvedPath);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('foreign_keys = ON');

  _db = drizzle(_sqlite, { schema });

  createTables(_sqlite);

  return _db;
}

/**
 * Get the current database instance. Throws if not initialized.
 */
export function getDb() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

/**
 * Get the raw better-sqlite3 connection.
 */
export function getSqlite() {
  if (!_sqlite) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _sqlite;
}

/**
 * Close the database connection.
 */
export function closeDatabase() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}

/**
 * Create all tables if they don't exist.
 */
function createTables(sqlite) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_sync_at TEXT
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      deck_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
    CREATE INDEX IF NOT EXISTS idx_decks_user_sync ON decks(user_id, synced_at);

    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      deck_id TEXT NOT NULL,
      progress_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user_deck ON progress(user_id, deck_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user_sync ON progress(user_id, synced_at);

    CREATE TABLE IF NOT EXISTS sync_cursors (
      user_id TEXT NOT NULL REFERENCES users(id),
      data_type TEXT NOT NULL CHECK(data_type IN ('decks', 'progress')),
      last_sync_at TEXT NOT NULL,
      last_row_version INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, data_type)
    );
  `);
}
