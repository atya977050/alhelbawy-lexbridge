PRAGMA foreign_keys = ON;

ALTER TABLE users
ADD COLUMN bio TEXT;

CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);
