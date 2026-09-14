#!/data/data/com.termux/files/usr/bin/bash
set -e

BASE="http://127.0.0.1:3000"
USERNAME="phase2_$(date +%s)"
PASSWORD="Phase2_Test_123!"
DISPLAY="Phase 2 Test"

echo "========================================"
echo " PHASE 2 FUNCTIONAL TEST"
echo "========================================"

echo
echo "[1] Syntax checks..."

node --check server.js
node --check server/services/session-service.js
node --check server/services/auth-service.js
node --check server/services/account-service.js
node --check server/routes/accounts.js
node --check server/routes/auth.js

echo "SYNTAX_OK"

echo
echo "[2] Starting server..."

mkdir -p logs
node server.js > logs/lexbridge-phase2.log 2>&1 &
SERVER_PID=$!

cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT

sleep 2

echo "SERVER_STARTED"

echo
echo "[3] Health check..."

HEALTH=$(curl -fsS "$BASE/api/health")

echo "$HEALTH" | grep -q '"ok":true'

echo "HEALTH_OK"

echo
echo "[4] Register account..."

REGISTER=$(curl -fsS \
    -X POST \
    "$BASE/api/accounts/register" \
    -H 'Content-Type: application/json' \
    -d "{
        \"username\":\"$USERNAME\",
        \"displayName\":\"$DISPLAY\",
        \"password\":\"$PASSWORD\"
    }")

echo "$REGISTER" | grep -q '"ok":true'

USER_ID=$(printf '%s' "$REGISTER" |
    python -c '
import json,sys
d=json.load(sys.stdin)
print(d["account"]["user"]["user_id"])
')

echo "ACCOUNT_CREATED_OK"
echo "USER_ID=$USER_ID"

echo
echo "[5] Password hash verification..."

HASH_COUNT=$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM users
     WHERE user_id='$USER_ID'
     AND password_hash IS NOT NULL
     AND length(password_hash) > 20;")

[ "$HASH_COUNT" = "1" ]

echo "PASSWORD_HASH_OK"

echo
echo "[6] Automatic room..."

ROOM_COUNT=$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM rooms
     WHERE owner_user_id='$USER_ID';")

[ "$ROOM_COUNT" = "1" ]

echo "AUTO_ROOM_OK"

echo
echo "[7] Automatic wallet..."

WALLET_COUNT=$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM wallets
     WHERE user_id='$USER_ID';")

[ "$WALLET_COUNT" = "1" ]

echo "AUTO_WALLET_OK"

echo
echo "[8] Login..."

LOGIN=$(curl -fsS \
    -X POST \
    "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{
        \"username\":\"$USERNAME\",
        \"password\":\"$PASSWORD\"
    }")

echo "$LOGIN" | grep -q '"ok":true'

TOKEN=$(printf '%s' "$LOGIN" |
    python -c '
import json,sys
d=json.load(sys.stdin)
print(d["session"]["token"])
')

SESSION_ID=$(printf '%s' "$LOGIN" |
    python -c '
import json,sys
d=json.load(sys.stdin)
print(d["session"]["sessionId"])
')

[ -n "$TOKEN" ]
[ -n "$SESSION_ID" ]

echo "LOGIN_OK"
echo "SESSION_CREATED_OK"

echo
echo "[9] Verify token is hashed in database..."

TOKEN_HASH_COUNT=$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM sessions
     WHERE session_id='$SESSION_ID'
     AND token_hash IS NOT NULL
     AND token_hash != '$TOKEN';")

[ "$TOKEN_HASH_COUNT" = "1" ]

echo "TOKEN_HASH_OK"

echo
echo "[10] Wrong password must fail..."

BAD_LOGIN_STATUS=$(curl -sS \
    -o logs/lexbridge-bad-login.json \
    -w '%{http_code}' \
    -X POST \
    "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{
        \"username\":\"$USERNAME\",
        \"password\":\"WrongPassword_123!\"
    }")

[ "$BAD_LOGIN_STATUS" = "401" ]

echo "INVALID_PASSWORD_OK"

echo
echo "[11] Current session..."

ME=$(curl -fsS \
    "$BASE/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")

echo "$ME" | grep -q '"ok":true'
echo "$ME" | grep -q "\"username\":\"$USERNAME\""

echo "SESSION_ME_OK"

echo
echo "[12] Logout..."

LOGOUT=$(curl -fsS \
    -X POST \
    "$BASE/api/auth/logout" \
    -H "Authorization: Bearer $TOKEN")

echo "$LOGOUT" | grep -q '"ok":true'

echo "LOGOUT_OK"

echo
echo "[13] Session must be invalid after logout..."

AFTER_LOGOUT_STATUS=$(curl -sS \
    -o logs/lexbridge-after-logout.json \
    -w '%{http_code}' \
    "$BASE/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")

[ "$AFTER_LOGOUT_STATUS" = "401" ]

echo "SESSION_REVOKED_OK"

echo
echo "[14] Cleanup..."

sqlite3 data/lexbridge.sqlite <<SQL
PRAGMA foreign_keys = ON;

DELETE FROM sessions
WHERE user_id = '$USER_ID';

DELETE FROM wallet_transactions
WHERE user_id = '$USER_ID';

DELETE FROM wallets
WHERE user_id = '$USER_ID';

DELETE FROM rooms
WHERE owner_user_id = '$USER_ID';

DELETE FROM follows
WHERE follower_user_id = '$USER_ID'
   OR followed_user_id = '$USER_ID';

DELETE FROM friendships
WHERE user_id = '$USER_ID'
   OR friend_user_id = '$USER_ID';

DELETE FROM visits
WHERE visitor_user_id = '$USER_ID'
   OR visited_user_id = '$USER_ID';

DELETE FROM users
WHERE user_id = '$USER_ID';
SQL

REMAINING=$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM users
     WHERE user_id='$USER_ID';")

[ "$REMAINING" = "0" ]

echo "CLEANUP_OK"

echo
echo "========================================"
echo " PHASE 2 SUCCESS"
echo "========================================"
