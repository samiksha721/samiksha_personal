import { DatabaseSync } from "node:sqlite";

export type DB = DatabaseSync;

export function openDatabase(path: string): DB {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL REFERENCES users(id),
      window_start TEXT NOT NULL,
      window_end TEXT NOT NULL,
      trip_length INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      confirmed_start TEXT,
      confirmed_end TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      joined_at TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS availability (
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      day TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id, day)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      uploader_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      added_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
