/**
 * Drizzle ORM Schema for Quizly Sync Server
 *
 * Tables: users, decks, progress, sync_cursors
 * Mirrors shredly's pattern: SQLite + Drizzle + soft-deletes + LWW sync.
 */

import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull(),
  displayName: text('display_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  lastSyncAt: text('last_sync_at'),
});

export const decks = sqliteTable(
  'decks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    deckJson: text('deck_json').notNull(),
    updatedAt: text('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    version: integer('version').notNull().default(1),
    syncedAt: text('synced_at').notNull(),
  },
  (table) => [
    index('idx_decks_user').on(table.userId),
    index('idx_decks_user_sync').on(table.userId, table.syncedAt),
  ]
);

export const progress = sqliteTable(
  'progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    deckId: text('deck_id').notNull(),
    progressJson: text('progress_json').notNull(),
    updatedAt: text('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    version: integer('version').notNull().default(1),
    syncedAt: text('synced_at').notNull(),
  },
  (table) => [
    index('idx_progress_user').on(table.userId),
    index('idx_progress_user_deck').on(table.userId, table.deckId),
    index('idx_progress_user_sync').on(table.userId, table.syncedAt),
  ]
);

export const syncCursors = sqliteTable(
  'sync_cursors',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    dataType: text('data_type', { enum: ['decks', 'progress'] }).notNull(),
    lastSyncAt: text('last_sync_at').notNull(),
    lastRowVersion: integer('last_row_version').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.dataType] })]
);
