#!/data/data/com.termux/files/usr/bin/bash
set -e

BASE="http://127.0.0.1:3458"
USER="phase8_room_user"
PASS="Phase8_Test_123!"

echo "========================================"
echo " PHASE 8 FUNCTIONAL TEST"
echo "========================================"

REG=$(curl -s -X POST "$BASE/api/accounts/register" \
-H "Content-Type: application/json" \
-d "{\"username\":\"$USER\",\"displayName\":\"Phase 8 User\",\"password\":\"$PASS\"}")
echo "REGISTER_OK"

LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
-H "Content-Type: application/json" \
-d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")

TOKEN=$(printf '%s' "$LOGIN" | python -c 'import sys,json; print(json.load(sys.stdin)["session"]["token"])')
AUTH="Authorization: Bearer $TOKEN"
echo "LOGIN_OK"

ME=$(curl -s "$BASE/api/rooms/me" -H "$AUTH")
ROOM_ID=$(printf '%s' "$ME" | python -c 'import sys,json; print(json.load(sys.stdin)["room"]["room_id"])')
echo "PERSONAL_ROOM_OK: $ROOM_ID"

START=$(curl -s -X POST "$BASE/api/room-engine/start" -H "$AUTH")
printf '%s' "$START" | grep -q '"ok":true'
echo "ENGINE_START_OK"

STATE=$(curl -s "$BASE/api/room-engine/$ROOM_ID" -H "$AUTH")
printf '%s' "$STATE" | grep -q '"active":true'
echo "ENGINE_STATE_OK"

ROLE=$(curl -s "$BASE/api/room-engine/$ROOM_ID/role" -H "$AUTH")
printf '%s' "$ROLE" | grep -q '"role":"host"'
echo "HOST_ROLE_OK"

JOIN=$(curl -s -X POST "$BASE/api/room-engine/$ROOM_ID/join" -H "$AUTH")
printf '%s' "$JOIN" | grep -q '"ok":true'
echo "HOST_JOIN_OK"

LEAVE=$(curl -s -X POST "$BASE/api/room-engine/$ROOM_ID/leave" -H "$AUTH")
printf '%s' "$LEAVE" | grep -q 'HOST_MUST_STOP_ROOM'
echo "HOST_LEAVE_PROTECTION_OK"

STOP=$(curl -s -X POST "$BASE/api/room-engine/stop" -H "$AUTH")
printf '%s' "$STOP" | grep -q '"ok":true'
echo "ENGINE_STOP_OK"

HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/room-engine/$ROOM_ID")
case "$HTTP" in
401|403) echo "AUTH_PROTECTION_OK" ;;
*) echo "AUTH_PROTECTION_FAILED: $HTTP"; exit 1 ;;
esac

echo "========================================"
echo " PHASE 8 SUCCESS"
echo "========================================"
