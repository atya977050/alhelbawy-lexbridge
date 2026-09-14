#!/data/data/com.termux/files/usr/bin/bash
set -e

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

PORT=3000
BASE="http://127.0.0.1:$PORT"
USERNAME="phase1_$(date +%s)"

echo "========================================"
echo " PHASE 1 FUNCTIONAL TEST"
echo "========================================"

node --check server.js
node --check server/services/account-service.js
node --check server/routes/accounts.js

echo "[1] Starting server..."

node server.js > logs/phase1-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo "[2] Health check..."

HEALTH=$(curl -s "$BASE/api/health")

echo "$HEALTH" | grep -q '"ok":true'

echo "HEALTH_OK"

echo "[3] Register account..."

REGISTER=$(curl -s \
    -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"display_name\":\"اختبار المرحلة الأولى\"}" \
    "$BASE/api/accounts/register")

echo "$REGISTER"

echo "$REGISTER" | grep -q '"ok":true'

USER_ID=$(printf '%s' "$REGISTER" | python -c '
import sys,json
data=json.load(sys.stdin)
print(data["account"]["user_id"])
')

ROOM_ID=$(printf '%s' "$REGISTER" | python -c '
import sys,json
data=json.load(sys.stdin)
print(data["account"]["room_id"])
')

WALLET_ID=$(printf '%s' "$REGISTER" | python -c '
import sys,json
data=json.load(sys.stdin)
print(data["account"]["wallet_id"])
')

test -n "$USER_ID"
test -n "$ROOM_ID"
test -n "$WALLET_ID"

echo "ACCOUNT_CREATED_OK"
echo "USER_ID=$USER_ID"
echo "ROOM_ID=$ROOM_ID"
echo "WALLET_ID=$WALLET_ID"

echo "[4] Checking automatic room..."

ROOM_OWNER=$(sqlite3 "$PROJECT/data/lexbridge.sqlite" \
    "SELECT owner_user_id FROM rooms WHERE room_id='$ROOM_ID';")

[ "$ROOM_OWNER" = "$USER_ID" ]

echo "AUTO_ROOM_OK"

echo "[5] Checking automatic wallet..."

WALLET_OWNER=$(sqlite3 "$PROJECT/data/lexbridge.sqlite" \
    "SELECT user_id FROM wallets WHERE wallet_id='$WALLET_ID';")

[ "$WALLET_OWNER" = "$USER_ID" ]

echo "AUTO_WALLET_OK"

echo "[6] Duplicate username test..."

DUPLICATE_STATUS=$(curl -s \
    -o /dev/null \
    -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"display_name\":\"محاولة مكررة\"}" \
    "$BASE/api/accounts/register")

[ "$DUPLICATE_STATUS" = "409" ]

echo "DUPLICATE_USER_OK"

echo "[7] Reading account..."

ACCOUNT=$(curl -s "$BASE/api/accounts/$USER_ID")

echo "$ACCOUNT" | grep -q '"ok":true'
echo "$ACCOUNT" | grep -q "$USERNAME"

echo "GET_ACCOUNT_OK"

echo "[8] Cleaning test data..."

sqlite3 "$PROJECT/data/lexbridge.sqlite" <<SQL
PRAGMA foreign_keys = ON;

BEGIN;

DELETE FROM wallet_transactions
WHERE user_id = '$USER_ID';

DELETE FROM wallets
WHERE user_id = '$USER_ID';

DELETE FROM rooms
WHERE owner_user_id = '$USER_ID';

DELETE FROM sessions
WHERE user_id = '$USER_ID';

DELETE FROM visits
WHERE visitor_user_id = '$USER_ID'
   OR visited_user_id = '$USER_ID';

DELETE FROM follows
WHERE follower_user_id = '$USER_ID'
   OR followed_user_id = '$USER_ID';

DELETE FROM friendships
WHERE user_id = '$USER_ID'
   OR friend_user_id = '$USER_ID';

DELETE FROM users
WHERE user_id = '$USER_ID';

COMMIT;
SQL

echo "CLEANUP_OK"

echo
echo "========================================"
echo " PHASE 1 SUCCESS"
echo "========================================"
