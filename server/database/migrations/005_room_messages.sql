PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS room_messages (
    message_id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(room_id)
        REFERENCES rooms(room_id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_time
ON room_messages(room_id, created_at);

CREATE INDEX IF NOT EXISTS idx_room_messages_user
ON room_messages(user_id);
