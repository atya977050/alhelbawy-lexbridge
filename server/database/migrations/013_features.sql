PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS feature_catalog (
    feature_id TEXT PRIMARY KEY,
    feature_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    icon TEXT NOT NULL DEFAULT '⭐',
    required_level INTEGER NOT NULL DEFAULT 1,
    required_membership TEXT NOT NULL DEFAULT 'FREE',
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_features (
    user_feature_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    feature_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'LOCKED',
    activated_at TEXT,
    expires_at TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, feature_id),

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY(feature_id)
        REFERENCES feature_catalog(feature_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_memberships (
    membership_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    membership_type TEXT NOT NULL DEFAULT 'FREE',
    level INTEGER NOT NULL DEFAULT 1,
    points INTEGER NOT NULL DEFAULT 0,
    started_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_catalog_enabled
ON feature_catalog(enabled, sort_order);

CREATE INDEX IF NOT EXISTS idx_user_features_user
ON user_features(user_id);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user
ON user_memberships(user_id);
