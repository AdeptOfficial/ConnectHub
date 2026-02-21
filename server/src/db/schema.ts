import { Database } from "bun:sqlite";

export function runMigrations(db: Database) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_hash TEXT,
      identity_key TEXT NOT NULL,
      signed_prekey TEXT,
      signed_prekey_sig TEXT,
      created_at INTEGER NOT NULL,
      flags INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS one_time_prekeys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      prekey TEXT NOT NULL,
      used INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      encrypted_config BLOB NOT NULL,
      history_visibility TEXT DEFAULT '7d',
      lease_ttl TEXT DEFAULT '7d',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      space_id TEXT NOT NULL REFERENCES spaces(id),
      type INTEGER NOT NULL DEFAULT 0,
      encrypted_name BLOB,
      position INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS space_members (
      space_id TEXT NOT NULL REFERENCES spaces(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role INTEGER DEFAULT 0,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (space_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      space_id TEXT NOT NULL REFERENCES spaces(id),
      creator_id TEXT NOT NULL REFERENCES users(id),
      max_uses INTEGER,
      use_count INTEGER DEFAULT 0,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      encrypted_content BLOB NOT NULL,
      lease_envelope BLOB,
      type INTEGER DEFAULT 0,
      flags INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      edited_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, id);

    CREATE TABLE IF NOT EXISTS mls_groups (
      space_id TEXT PRIMARY KEY REFERENCES spaces(id),
      group_state BLOB NOT NULL,
      epoch INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS read_states (
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      last_message_id TEXT,
      mention_count INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS dm_channels (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user1_id, user2_id)
    );
  `);
}
