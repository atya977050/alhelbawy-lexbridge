PRAGMA foreign_keys = ON;

ALTER TABLE rooms ADD COLUMN rules TEXT;
ALTER TABLE rooms ADD COLUMN welcome_message TEXT;
ALTER TABLE rooms ADD COLUMN cover_image TEXT;
ALTER TABLE rooms ADD COLUMN max_viewers INTEGER NOT NULL DEFAULT 100;
ALTER TABLE rooms ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_rooms_status
ON rooms(status);

CREATE INDEX IF NOT EXISTS idx_rooms_owner
ON rooms(owner_user_id);
