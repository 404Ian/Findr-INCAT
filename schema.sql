DROP TABLE IF EXISTS messages;

DROP TABLE IF EXISTS verification_claims;

DROP TABLE IF EXISTS wall_posts;

DROP TABLE IF EXISTS items;

DROP TABLE IF EXISTS users; 

CREATE TABLE
    users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'staff')),
        department_or_section TEXT,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime ('now'))
    );

CREATE TABLE
    items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tag_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('safe', 'lost')) DEFAULT 'safe',
        custom_note TEXT NOT NULL,
        contact_config_json TEXT NOT NULL,
        meetup_hub TEXT,
        meetup_room TEXT,
        lat REAL,
        lng REAL,
        created_at TEXT NOT NULL DEFAULT (datetime ('now')),
        FOREIGN KEY (user_id) REFERENCES users (id)
    );

CREATE TABLE
    wall_posts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        poster_name TEXT NOT NULL,
        poster_role TEXT NOT NULL CHECK (poster_role IN ('student', 'faculty', 'staff')),
        poster_dept TEXT,
        edit_passcode_hash TEXT,
        linked_item_id TEXT,
        post_type TEXT NOT NULL CHECK (post_type IN ('lost', 'found')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        campus_hub TEXT NOT NULL,
        room_detail TEXT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        verification_question TEXT,
        sensitive_pickup_note TEXT,
        contact_config_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('open', 'verifying', 'resolved')) DEFAULT 'open',
        created_at TEXT NOT NULL DEFAULT (datetime ('now')),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (linked_item_id) REFERENCES items (id)
    );

CREATE TABLE
    verification_claims (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        claimant_name TEXT NOT NULL,
        claimant_role TEXT NOT NULL CHECK (claimant_role IN ('student', 'faculty', 'staff')),
        verification_answer TEXT NOT NULL,
        contact_info TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime ('now')),
        FOREIGN KEY (post_id) REFERENCES wall_posts (id)
    );

CREATE TABLE
    messages (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        item_id TEXT,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'faculty', 'staff')),
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime ('now'))
    );

CREATE INDEX idx_wall_posts_type_status ON wall_posts (post_type, status);

CREATE INDEX idx_items_tag_code ON items (tag_code);

CREATE INDEX idx_claims_post_id ON verification_claims (post_id);

CREATE INDEX idx_messages_post_item ON messages (post_id, item_id);