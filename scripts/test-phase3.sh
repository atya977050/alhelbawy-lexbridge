#!/data/data/com.termux/files/usr/bin/bash
set -e

BASE="http://127.0.0.1:3000"
USERNAME="phase3_$(date +%s)"
PASSWORD="Phase3_Test_123!"
DISPLAY="Phase 3 Test"

echo "========================================"
echo " PHASE 3 FUNCTIONAL TEST"
echo "========================================"

echo
echo "[1] Syntax checks..."

node --check server.js
node --check server/middleware/auth.js
node --check server/services/profile-service.js
node --check server/routes/profile.js

echo "SYNTAX_OK"

echo
echo "[2] Starting server..."

mkdir -p logs

node server.js > logs/lexbridge-phase3.log 2>&1 &
SERVER_PID=$!

cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT

sleep 2

echo "SERVER_STARTED"

echo
echo "[3] Health..."

curl -fsS "$BASE/api/health" |
    grep -q '"ok":true'

echo "HEALTH_OK"

echo
echo "[4] Register..."

REGISTER=$(curl -fsS \
    -X POST \
    "$BASE/api/accounts/register" \
    -H 'Content-Type: application/json' \
    -d "{
        \"username\":\"$USERNAME\",
        \"displayName\":\"$DISPLAY\",
        \"password\":\"$PASSWORD\"
    }")

echo "$REGISTER" |
    grep -q '"ok":true'

USER_ID=$(printf '%s' "$REGISTER" |
    python -c '
import json,sys
d=json.load(sys.stdin)
print(d["account"]["user"]["user_id"])
')

echo "REGISTER_OK"

echo
echo "[5] Login..."

LOGIN=$(curl -fsS \
    -X POST \
    "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{
        \"username\":\"$USERNAME\",
        \"password\":\"$PASSWORD\"
    }")

TOKEN=$(printf '%s' "$LOGIN" |
    python -c '
import json,sys
d=json.load(sys.stdin)
print(d["session"]["token"])
')

[ -n "$TOKEN" ]

echo "LOGIN_OK"

echo
echo "[6] My profile..."

ME=$(curl -fsS \
    "$BASE/api/profile/me" \
    -H "Authorization: Bearer $TOKEN")

echo "$ME" |
    grep -q '"ok":true'

echo "$ME" |
    grep -q "\"username\":\"$USERNAME\""

echo "$ME" |
    grep -q "\"display_name\":\"$DISPLAY\""

echo "PROFILE_READ_OK"

echo
echo "[7] Update profile..."

UPDATED=$(curl -fsS \
    -X PATCH \
    "$BASE/api/profile/me" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{
        "displayName":"Phase 3 Updated",
        "avatar":"https://example.invalid/avatar.png",
        "bio":"نبذة اختبار Phase 3"
    }')

echo "$UPDATED" |
    grep -q '"ok":true'

echo "$UPDATED" |
    grep -q '"display_name":"Phase 3 Updated"'

echo "$UPDATED" |
    grep -q '"bio":"نبذة اختبار Phase 3"'

echo "PROFILE_UPDATE_OK"

echo
echo "[8] Verify room name follows display name..."

ROOM_NAME=$(sqlite3 data/lexbridge.sqlite \
    "SELECT name FROM rooms
     WHERE owner_user_id='$USER_ID'
     LIMIT 1;")

[ "$ROOM_NAME" = "غرفة Phase 3 Updated" ]

echo "ROOM_PROFILE_SYNC_OK"

echo
echo "[9] Unauthenticated profile must fail..."

STATUS=$(curl -sS \
    -o logs/phase3-unauthorized.json \
    -w '%{http_code}' \
    "$BASE/api/profile/me")

[ "$STATUS" = "401" ]

echo "AUTH_PROTECTION_OK"

echo
echo "[10] Cleanup..."

sqlite3 data/lexbridge.sqlite <<SQL
PRAGMA foreign_keys = ON;

DELETE FROM sessions
WHERE user_id = '$USER_ID';

DELETE FROM visits
WHERE visitor_user_id = '$USER_ID'
   OR visited_user_id = '$USER_ID';

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
echo " PHASE 3 SUCCESS"
echo "========================================"
