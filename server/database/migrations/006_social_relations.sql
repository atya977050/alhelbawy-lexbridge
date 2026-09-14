PRAGMA foreign_keys = ON;

ALTER TABLE friendships
ADD COLUMN requested_by_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_friendships_user
ON friendships(user_id, friend_user_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_requester
ON friendships(requested_by_user_id, status);

CREATE INDEX IF NOT EXISTS idx_follows_pair
ON follows(follower_user_id, followed_user_id);

CREATE INDEX IF NOT EXISTS idx_visits_visitor
ON visits(visitor_user_id, visited_at);
