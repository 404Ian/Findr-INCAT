-- migrations/0001_init.sql
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS users;

DROP TABLE IF EXISTS profiles;

CREATE TABLE
    IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        building TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('dropoff', 'lab', 'facility')),
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        description TEXT NOT NULL
    );

CREATE TABLE
    IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        public_code TEXT NOT NULL UNIQUE,
        manage_key_hash TEXT NOT NULL,
        label TEXT NOT NULL,
        item_type TEXT NOT NULL,
        photo_key TEXT,
        contact_methods TEXT NOT NULL DEFAULT '{"methods":[],"relayMode":true}',
        relay_mode INTEGER NOT NULL DEFAULT 1,
        lost_mode INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        revoked_at TEXT
    );

CREATE INDEX IF NOT EXISTS idx_tags_public_code ON tags (public_code);

CREATE INDEX IF NOT EXISTS idx_tags_manage_key_hash ON tags (manage_key_hash);

CREATE TABLE
    IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        location_id TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        image_keys TEXT NOT NULL DEFAULT '[]',
        contact TEXT NOT NULL DEFAULT '{"methods":[],"relayMode":true}',
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'returned')),
        linked_tag_code TEXT,
        claim_question TEXT,
        claim_answer_hash TEXT,
        edit_key_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        resolved_at TEXT,
        FOREIGN KEY (location_id) REFERENCES locations (id)
    );

CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts (type, status);

CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category);

CREATE INDEX IF NOT EXISTS idx_posts_location_id ON posts (location_id);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);

CREATE TABLE
    IF NOT EXISTS scan_events (
        id TEXT PRIMARY KEY,
        tag_id TEXT NOT NULL,
        scanned_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        approx_location TEXT,
        user_agent_hash TEXT NOT NULL,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_scan_events_tag_id ON scan_events (tag_id, scanned_at DESC);

CREATE TABLE
    IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        tag_id TEXT NOT NULL,
        body TEXT NOT NULL,
        finder_contact TEXT,
        approx_location TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        read_at TEXT,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_messages_tag_id ON messages (tag_id, created_at DESC);

CREATE TABLE
    IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL CHECK (target_type IN ('post', 'tag')),
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

CREATE TABLE
    IF NOT EXISTS rate_limits (
        bucket_key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        window_start INTEGER NOT NULL
    );

CREATE TABLE
    IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );