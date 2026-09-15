PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS room_ads (
    ad_id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(room_id)
        REFERENCES rooms(room_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_ads_room_active
ON room_ads(room_id, active, created_at);
