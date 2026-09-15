PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS activity_events (
    activity_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_time
ON activity_events(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_activity_events_key_time
ON activity_events(activity_key, created_at);
