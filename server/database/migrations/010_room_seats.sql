PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS room_seats (
    seat_id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    seat_number INTEGER NOT NULL,
    user_id TEXT,
    status TEXT NOT NULL DEFAULT 'EMPTY',
    mic_enabled INTEGER NOT NULL DEFAULT 0,
    camera_enabled INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(room_id, seat_number),

    FOREIGN KEY(room_id)
        REFERENCES rooms(room_id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CHECK(seat_number >= 1 AND seat_number <= 12),
    CHECK(status IN ('EMPTY', 'REQUESTED', 'OCCUPIED'))
);

CREATE INDEX IF NOT EXISTS idx_room_seats_room
ON room_seats(room_id);

CREATE INDEX IF NOT EXISTS idx_room_seats_user
ON room_seats(user_id);
