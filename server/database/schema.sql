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


-- 002_add_password_hash.sql
PRAGMA foreign_keys = ON;


CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);


-- 003_profile.sql
PRAGMA foreign_keys = ON;


CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);


-- 004_room_settings.sql
PRAGMA foreign_keys = ON;


CREATE INDEX IF NOT EXISTS idx_rooms_status
ON rooms(status);

CREATE INDEX IF NOT EXISTS idx_rooms_owner
ON rooms(owner_user_id);


-- 006_social_relations.sql
PRAGMA foreign_keys = ON;



CREATE INDEX IF NOT EXISTS idx_friendships_user
ON friendships(user_id, friend_user_id, status);



CREATE INDEX IF NOT EXISTS idx_follows_pair
ON follows(follower_user_id, followed_user_id);

CREATE INDEX IF NOT EXISTS idx_visits_visitor
ON visits(visitor_user_id, visited_at);


-- 010_room_seats.sql
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

-- ============================================================
-- LEXBRIDGE COMMERCE / COINS / VIP PURCHASE SYSTEM
-- ============================================================

PRAGMA foreign_keys = ON;

-- رصيد العملات الافتراضية داخل المنصة
CREATE TABLE IF NOT EXISTS coin_wallets (
    coin_wallet_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    balance_coins INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CHECK(balance_coins >= 0)
);

-- باقات شراء العملات
CREATE TABLE IF NOT EXISTS coin_packages (
    package_id TEXT PRIMARY KEY,
    package_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    price_minor INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    coins INTEGER NOT NULL,
    bonus_coins INTEGER NOT NULL DEFAULT 0,
    total_coins INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK(price_minor > 0),
    CHECK(coins > 0),
    CHECK(bonus_coins >= 0),
    CHECK(total_coins = coins + bonus_coins)
);

-- سجل عمليات العملات
CREATE TABLE IF NOT EXISTS coin_transactions (
    transaction_id TEXT PRIMARY KEY,
    coin_wallet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount_coins INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    idempotency_key TEXT UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(coin_wallet_id)
        REFERENCES coin_wallets(coin_wallet_id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CHECK(amount_coins > 0),
    CHECK(direction IN ('credit', 'debit')),
    CHECK(balance_before >= 0),
    CHECK(balance_after >= 0)
);

-- عمليات شراء باقات العملات
CREATE TABLE IF NOT EXISTS coin_purchases (
    purchase_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    package_code TEXT NOT NULL,
    price_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    coins INTEGER NOT NULL,
    bonus_coins INTEGER NOT NULL DEFAULT 0,
    total_coins INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    payment_reference TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY(package_id)
        REFERENCES coin_packages(package_id),

    CHECK(price_minor > 0),
    CHECK(total_coins = coins + bonus_coins),
    CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

-- منتجات العضوية المدفوعة
CREATE TABLE IF NOT EXISTS vip_products (
    product_id TEXT PRIMARY KEY,
    product_code TEXT NOT NULL UNIQUE,
    membership_type TEXT NOT NULL,
    level INTEGER NOT NULL,
    title TEXT NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    price_coins INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK(level >= 1 AND level <= 6),
    CHECK(duration_days > 0),
    CHECK(price_coins > 0),
    CHECK(membership_type IN ('VIP', 'SVIP'))
);

-- مشتريات VIP
CREATE TABLE IF NOT EXISTS vip_purchases (
    purchase_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_code TEXT NOT NULL,
    membership_type TEXT NOT NULL,
    level INTEGER NOT NULL,
    price_coins INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY(product_id)
        REFERENCES vip_products(product_id),

    CHECK(level >= 1 AND level <= 6),
    CHECK(price_coins > 0),
    CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user
ON coin_transactions(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user
ON coin_purchases(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_vip_products_level
ON vip_products(level, is_active);

CREATE INDEX IF NOT EXISTS idx_vip_purchases_user
ON vip_purchases(user_id, created_at);

