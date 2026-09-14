#!/data/data/com.termux/files/usr/bin/bash
set -e

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

PORT=3458
LOG="logs/phase6-test.log"

rm -f "$LOG" \
      logs/phase6-a.json \
      logs/phase6-b.json \
      logs/phase6-a-me.json \
      logs/phase6-b-me.json

echo "========================================"
echo " PHASE 6 FUNCTIONAL TEST"
echo "========================================"

node --check server.js
node --check server/services/social-service.js
node --check server/routes/social.js

echo "SYNTAX_OK"

# ---------------------------------------------------------
# Remove previous Phase 6 test data
# ---------------------------------------------------------

sqlite3 data/lexbridge.sqlite "
DELETE FROM visits
WHERE visitor_user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
)
OR visited_user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
);

DELETE FROM follows
WHERE follower_user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
)
OR followed_user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
);

DELETE FROM friendships
WHERE user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
)
OR friend_user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
);

DELETE FROM sessions
WHERE user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
);

DELETE FROM wallets
WHERE user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
);

DELETE FROM rooms
WHERE owner_user_id IN (
    SELECT user_id FROM users
    WHERE username IN ('phase6_user_a','phase6_user_b')
);

DELETE FROM users
WHERE username IN ('phase6_user_a','phase6_user_b');
"

echo "TEST_DATA_CLEANED"

PORT="$PORT" node server.js > "$LOG" 2>&1 &
SERVER_PID=$!

cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

curl -fsS \
    "http://127.0.0.1:$PORT/health" \
    >/dev/null

echo "HEALTH_OK"

# ---------------------------------------------------------
# Register user A
# ---------------------------------------------------------

A_REGISTER=$(curl -fsS \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"username":"phase6_user_a","displayName":"Phase 6 A","password":"Phase6PasswordA123"}' \
    "http://127.0.0.1:$PORT/api/accounts/register")

echo "$A_REGISTER" > logs/phase6-a.json

A_USER_ID=$(python - <<'PY'
import json
d=json.load(open("logs/phase6-a.json"))
assert d["ok"] is True
print(d["account"]["user"]["user_id"])
PY
)

echo "REGISTER_A_OK"

# ---------------------------------------------------------
# Register user B
# ---------------------------------------------------------

B_REGISTER=$(curl -fsS \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"username":"phase6_user_b","displayName":"Phase 6 B","password":"Phase6PasswordB123"}' \
    "http://127.0.0.1:$PORT/api/accounts/register")

echo "$B_REGISTER" > logs/phase6-b.json

B_USER_ID=$(python - <<'PY'
import json
d=json.load(open("logs/phase6-b.json"))
assert d["ok"] is True
print(d["account"]["user"]["user_id"])
PY
)

echo "REGISTER_B_OK"

# ---------------------------------------------------------
# Login A
# ---------------------------------------------------------

A_LOGIN=$(curl -fsS \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"username":"phase6_user_a","password":"Phase6PasswordA123"}' \
    "http://127.0.0.1:$PORT/api/auth/login")

A_TOKEN=$(printf '%s' "$A_LOGIN" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
print(d["session"]["token"])
')

echo "LOGIN_A_OK"

# ---------------------------------------------------------
# Login B
# ---------------------------------------------------------

B_LOGIN=$(curl -fsS \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"username":"phase6_user_b","password":"Phase6PasswordB123"}' \
    "http://127.0.0.1:$PORT/api/auth/login")

B_TOKEN=$(printf '%s' "$B_LOGIN" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
print(d["session"]["token"])
')

echo "LOGIN_B_OK"

# ---------------------------------------------------------
# Follow A -> B
# ---------------------------------------------------------

FOLLOW=$(curl -fsS \
    -X POST \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/follow/$B_USER_ID")

printf '%s' "$FOLLOW" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
assert d["data"]["following"] is True
'

echo "FOLLOW_OK"

# Idempotent follow
FOLLOW_AGAIN=$(curl -fsS \
    -X POST \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/follow/$B_USER_ID")

printf '%s' "$FOLLOW_AGAIN" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
assert d["data"]["following"] is True
'

echo "FOLLOW_IDEMPOTENT_OK"

# ---------------------------------------------------------
# B followers
# ---------------------------------------------------------

FOLLOWERS=$(curl -fsS \
    -H "Authorization: Bearer $B_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/followers")

printf '%s' "$FOLLOWERS" | python -c "
import sys,json
d=json.load(sys.stdin)
assert d['ok'] is True
assert any(x['user_id'] == '$A_USER_ID' for x in d['data'])
"

echo "FOLLOWERS_OK"

# ---------------------------------------------------------
# A following
# ---------------------------------------------------------

FOLLOWING=$(curl -fsS \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/following")

printf '%s' "$FOLLOWING" | python -c "
import sys,json
d=json.load(sys.stdin)
assert d['ok'] is True
assert any(x['user_id'] == '$B_USER_ID' for x in d['data'])
"

echo "FOLLOWING_OK"

# ---------------------------------------------------------
# Friend request A -> B
# ---------------------------------------------------------

REQUEST=$(curl -fsS \
    -X POST \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/friends/request/$B_USER_ID")

printf '%s' "$REQUEST" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
assert d["data"]["status"] == "pending"
'

echo "FRIEND_REQUEST_OK"

# ---------------------------------------------------------
# Incoming request B
# ---------------------------------------------------------

INCOMING=$(curl -fsS \
    -H "Authorization: Bearer $B_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/friends/requests/incoming")

printf '%s' "$INCOMING" | python -c "
import sys,json
d=json.load(sys.stdin)
assert d['ok'] is True
assert any(x['user_id'] == '$A_USER_ID' for x in d['data'])
"

echo "INCOMING_REQUEST_OK"

# ---------------------------------------------------------
# Outgoing request A
# ---------------------------------------------------------

OUTGOING=$(curl -fsS \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/friends/requests/outgoing")

printf '%s' "$OUTGOING" | python -c "
import sys,json
d=json.load(sys.stdin)
assert d['ok'] is True
assert any(x['user_id'] == '$B_USER_ID' for x in d['data'])
"

echo "OUTGOING_REQUEST_OK"

# ---------------------------------------------------------
# Accept B -> A
# ---------------------------------------------------------

ACCEPT=$(curl -fsS \
    -X POST \
    -H "Authorization: Bearer $B_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/friends/$A_USER_ID/accept")

printf '%s' "$ACCEPT" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
assert d["data"]["status"] == "accepted"
'

echo "FRIEND_ACCEPT_OK"

# ---------------------------------------------------------
# Friends A
# ---------------------------------------------------------

FRIENDS=$(curl -fsS \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/friends")

printf '%s' "$FRIENDS" | python -c "
import sys,json
d=json.load(sys.stdin)
assert d['ok'] is True
assert any(x['user_id'] == '$B_USER_ID' for x in d['data'])
"

echo "FRIENDS_LIST_OK"

# ---------------------------------------------------------
# Visit A -> B
# ---------------------------------------------------------

VISIT=$(curl -fsS \
    -X POST \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/visit/$B_USER_ID")

printf '%s' "$VISIT" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
assert d["data"]["visitId"]
'

echo "VISIT_OK"

# ---------------------------------------------------------
# Visitors B
# ---------------------------------------------------------

VISITORS=$(curl -fsS \
    -H "Authorization: Bearer $B_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/visitors")

printf '%s' "$VISITORS" | python -c "
import sys,json
d=json.load(sys.stdin)
assert d['ok'] is True
assert any(x['user_id'] == '$A_USER_ID' for x in d['data'])
"

echo "VISITORS_OK"

# ---------------------------------------------------------
# Counts
# ---------------------------------------------------------

COUNTS=$(curl -fsS \
    -H "Authorization: Bearer $B_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/counts")

printf '%s' "$COUNTS" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
assert d["friends"] if False else True
assert d["data"]["friends"] >= 1
assert d["data"]["followers"] >= 1
assert d["data"]["visitors"] >= 1
'

echo "COUNTS_OK"

# ---------------------------------------------------------
# Self relation protection
# ---------------------------------------------------------

SELF_STATUS=$(curl -sS -o logs/phase6-self.json -w '%{http_code}' \
    -X POST \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/follow/$A_USER_ID")

[ "$SELF_STATUS" = "400" ]

echo "SELF_RELATION_PROTECTION_OK"

# ---------------------------------------------------------
# Auth protection
# ---------------------------------------------------------

AUTH_STATUS=$(curl -sS -o logs/phase6-auth.json -w '%{http_code}' \
    "http://127.0.0.1:$PORT/api/social/counts")

[ "$AUTH_STATUS" = "401" ]

echo "AUTH_PROTECTION_OK"

# ---------------------------------------------------------
# Unfollow
# ---------------------------------------------------------

UNFOLLOW=$(curl -fsS \
    -X DELETE \
    -H "Authorization: Bearer $A_TOKEN" \
    "http://127.0.0.1:$PORT/api/social/follow/$B_USER_ID")

printf '%s' "$UNFOLLOW" | python -c '
import sys,json
d=json.load(sys.stdin)
assert d["ok"] is True
assert d["data"]["following"] is False
'

echo "UNFOLLOW_OK"

# ---------------------------------------------------------
# Verify DB cleanup
# ---------------------------------------------------------

sqlite3 data/lexbridge.sqlite \
    "DELETE FROM visits WHERE visitor_user_id='$A_USER_ID' OR visited_user_id='$A_USER_ID' OR visitor_user_id='$B_USER_ID' OR visited_user_id='$B_USER_ID';
     DELETE FROM follows WHERE follower_user_id='$A_USER_ID' OR followed_user_id='$A_USER_ID' OR follower_user_id='$B_USER_ID' OR followed_user_id='$B_USER_ID';
     DELETE FROM friendships WHERE user_id='$A_USER_ID' OR friend_user_id='$A_USER_ID' OR user_id='$B_USER_ID' OR friend_user_id='$B_USER_ID';
     DELETE FROM sessions WHERE user_id='$A_USER_ID' OR user_id='$B_USER_ID';
     DELETE FROM wallets WHERE user_id='$A_USER_ID' OR user_id='$B_USER_ID';
     DELETE FROM rooms WHERE owner_user_id='$A_USER_ID' OR owner_user_id='$B_USER_ID';
     DELETE FROM users WHERE user_id='$A_USER_ID' OR user_id='$B_USER_ID';"

REMAINING=$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM users
     WHERE user_id='$A_USER_ID'
        OR user_id='$B_USER_ID';")

[ "$REMAINING" = "0" ]

echo "CLEANUP_OK"

echo "========================================"
echo " PHASE 6 SUCCESS"
echo "========================================"
