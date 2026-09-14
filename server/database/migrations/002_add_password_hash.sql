PRAGMA foreign_keys = ON;

ALTER TABLE users
ADD COLUMN password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);
