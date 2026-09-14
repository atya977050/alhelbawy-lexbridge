PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'INACTIVE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS wallets (
    wallet_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL DEFAULT 'EGP',
    available_minor INTEGER NOT NULL DEFAULT 0,
    reserved_minor INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    transaction_id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    balance_before_minor INTEGER NOT NULL,
    balance_after_minor INTEGER NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    idempotency_key TEXT UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    CHECK(amount_minor > 0),
    CHECK(direction IN ('credit', 'debit'))
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS friendships (
    friendship_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_user_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(friend_user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS follows (
    follow_id TEXT PRIMARY KEY,
    follower_user_id TEXT NOT NULL,
    followed_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_user_id, followed_user_id),
    FOREIGN KEY(follower_user_id) REFERENCES users(user_id),
    FOREIGN KEY(followed_user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS visits (
    visit_id TEXT PRIMARY KEY,
    visitor_user_id TEXT NOT NULL,
    visited_user_id TEXT NOT NULL,
    visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(visitor_user_id) REFERENCES users(user_id),
    FOREIGN KEY(visited_user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_visits_visited_user
ON visits(visited_user_id, visited_at);

CREATE INDEX IF NOT EXISTS idx_follows_followed
ON follows(followed_user_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower
ON follows(follower_user_id);
