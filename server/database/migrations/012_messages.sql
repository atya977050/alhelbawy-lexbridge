PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS message_notifications (
    notification_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    related_user_id TEXT,
    related_room_id TEXT,
    related_activity_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY(related_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_message_notifications_user_time
ON message_notifications(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_message_notifications_user_read
ON message_notifications(user_id, is_read, created_at);

CREATE TABLE IF NOT EXISTS message_events (
    event_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    related_user_id TEXT,
    related_room_id TEXT,
    related_activity_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY(related_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_message_events_user_time
ON message_events(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_message_events_key_time
ON message_events(user_id, event_key);
