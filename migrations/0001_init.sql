-- Findr INCAT D1 Schema (No user accounts; capability-key architecture)
PRAGMA foreign_keys = ON;

CREATE TABLE
    IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        building_code TEXT NOT NULL,
        is_drop_off_hub INTEGER NOT NULL DEFAULT 1,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        description TEXT NOT NULL DEFAULT ''
    );

CREATE TABLE
    IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        location_id TEXT NOT NULL REFERENCES locations (id),
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        image_keys TEXT NOT NULL DEFAULT '[]', -- JSON array of R2 keys or relative media URLs
        contact TEXT NOT NULL, -- JSON ContactConfig
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'returned')),
        linked_tag_code TEXT,
        claim_question_prompt TEXT,
        claim_answer_hash TEXT,
        edit_key_hash TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        resolved_at TEXT
    );

CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts (type, status);

CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category);

CREATE INDEX IF NOT EXISTS idx_posts_location ON posts (location_id);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_edit_key_hash ON posts (edit_key_hash);

CREATE TABLE
    IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        public_code TEXT NOT NULL UNIQUE,
        manage_key_hash TEXT NOT NULL,
        label TEXT NOT NULL,
        item_type TEXT NOT NULL,
        photo_key TEXT,
        contact_methods TEXT NOT NULL, -- JSON ContactConfig
        relay_mode INTEGER NOT NULL DEFAULT 1,
        lost_mode INTEGER NOT NULL DEFAULT 0,
        lost_note TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        revoked_at TEXT
    );

CREATE INDEX IF NOT EXISTS idx_tags_public_code ON tags (public_code);

CREATE INDEX IF NOT EXISTS idx_tags_manage_key_hash ON tags (manage_key_hash);

CREATE TABLE
    IF NOT EXISTS scan_events (
        id TEXT PRIMARY KEY,
        tag_id TEXT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
        scanned_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        approx_location TEXT, -- Nullable JSON { lat, lng, label }
        user_agent_hash TEXT NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_scan_events_tag_id ON scan_events (tag_id, scanned_at DESC);

CREATE TABLE
    IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        tag_id TEXT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        finder_contact TEXT,
        found_at_hub TEXT,
        approx_location TEXT, -- Nullable JSON { lat, lng }
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        read_at TEXT
    );

CREATE INDEX IF NOT EXISTS idx_messages_tag_id ON messages (tag_id, created_at DESC);

CREATE TABLE
    IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL CHECK (target_type IN ('post', 'tag')),
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        reporter_ip_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%SZ', 'now')),
        resolved_at TEXT
    );

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);

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

INSERT
OR IGNORE INTO locations (
    id,
    name,
    building_code,
    is_drop_off_hub,
    lat,
    lng,
    description
)
VALUES
    (
        'loc-guard-house',
        'Guard House',
        'GATE',
        1,
        18.203499,
        120.592695,
        'Guard House. Official drop-off point for found items.'
    ),
    (
        'loc-admin',
        'Administration Building',
        'ADMIN',
        1,
        18.203466,
        120.592876,
        'Administration Building. Official drop-off point for found items.'
    ),
    (
        'loc-guidance',
        'Guidance Office',
        'GUIDANCE',
        1,
        18.203874,
        120.593395,
        'Guidance Office, JHS building. Official drop-off point for found items.'
    ),
    (
        'loc-ict-jhs',
        'ICT (JHS)',
        'ICT-JHS',
        0,
        18.203857,
        120.592504,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-ict-shs',
        'ICT (SHS)',
        'ICT-SHS',
        0,
        18.203611,
        120.592416,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-garments',
        'Garments',
        'GARMENTS',
        0,
        18.204366,
        120.592019,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-practical-arts',
        'Practical Arts',
        'PRACTICAL',
        0,
        18.204866,
        120.592829,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-science',
        'Science Building',
        'SCIENCE',
        0,
        18.204721,
        120.59212,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    ),
    (
        'loc-centennial-park',
        'Centennial Park',
        'PARK',
        0,
        18.204481,
        120.592751,
        'Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.'
    );