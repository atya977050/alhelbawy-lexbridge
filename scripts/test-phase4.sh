#!/data/data/com.termux/files/usr/bin/bash
set -e

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

LOG="$PROJECT/logs/phase4-test.log"
rm -f "$LOG"

echo "PHASE 4 FUNCTIONAL TEST" | tee "$LOG"

node --check server.js
node --check server/services/room-service.js
node --check server/services/room-presence-service.js
node --check server/routes/rooms.js

echo "SYNTAX_OK" | tee -a "$LOG"

PORT=3456 node server.js > "$LOG.server" 2>&1 &
SERVER_PID=$!

cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT

sleep 2

curl -fsS \
    "http://127.0.0.1:3456/api/health" \
    > "$LOG.health"

python - <<'PY'
import json
data = json.load(open("logs/phase4-test.log.health"))
assert data["ok"] is True
assert data["database"] == "ok"
print("HEALTH_OK")
PY

USERNAME="phase4_$(date +%s)"
PASSWORD="Phase4Password123"

REGISTER=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3456/api/accounts/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"displayName\":\"اختبار المرحلة الرابعة\",\"password\":\"$PASSWORD\"}")

printf '%s' "$REGISTER" > "$LOG.register"

python - <<'PY'
import json
data = json.load(open("logs/phase4-test.log.register"))
assert data["ok"] is True
assert data["account"]["room"]["room_id"]
print("REGISTER_OK")
PY

LOGIN=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3456/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

printf '%s' "$LOGIN" > "$LOG.login"

TOKEN=$(python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.login"))
assert d["ok"] is True
print(d["session"]["token"])
PY
)

USER_ID=$(python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.login"))
print(d["user"]["user_id"])
PY
)

echo "LOGIN_OK"

ROOM=$(curl -fsS \
    -H "Authorization: Bearer $TOKEN" \
    "http://127.0.0.1:3456/api/rooms/me")

printf '%s' "$ROOM" > "$LOG.room"

ROOM_ID=$(python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.room"))
assert d["ok"] is True
r=d["room"]
assert r["room_id"]
assert r["owner_user_id"]
assert r["status"] == "INACTIVE"
assert r["max_viewers"] == 100
print(r["room_id"])
PY
)

echo "PERSONAL_ROOM_OK"

UPDATE=$(curl -fsS \
    -X PATCH \
    "http://127.0.0.1:3456/api/rooms/me" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name":"غرفة اختبار الهلباوى",
        "description":"غرفة المرحلة الرابعة",
        "rules":"الاحترام ممنوع الإساءة",
        "welcomeMessage":"أهلاً وسهلاً بكم",
        "maxViewers":50,
        "isLocked":false
    }')

printf '%s' "$UPDATE" > "$LOG.update"

python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.update"))
assert d["ok"] is True
r=d["room"]
assert r["name"] == "غرفة اختبار الهلباوى"
assert r["max_viewers"] == 50
assert r["is_locked"] is False
print("ROOM_UPDATE_OK")
PY

START=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3456/api/rooms/me/start" \
    -H "Authorization: Bearer $TOKEN")

printf '%s' "$START" > "$LOG.start"

python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.start"))
assert d["ok"] is True
assert d["room"]["status"] == "LIVE"
print("ROOM_START_OK")
PY

ENTER=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3456/api/rooms/$ROOM_ID/enter" \
    -H "Authorization: Bearer $TOKEN")

printf '%s' "$ENTER" > "$LOG.enter"

python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.enter"))
assert d["ok"] is True
assert d["entered"] is True
assert d["is_owner"] is True
print("ROOM_ENTER_OK")
PY

COUNT=$(curl -fsS \
    -H "Authorization: Bearer $TOKEN" \
    "http://127.0.0.1:3456/api/rooms/$ROOM_ID")

printf '%s' "$COUNT" > "$LOG.count"

python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.count"))
assert d["ok"] is True
assert d["room"]["viewer_count"] >= 1
print("VIEWER_COUNT_OK")
PY

LEAVE=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3456/api/rooms/$ROOM_ID/leave" \
    -H "Authorization: Bearer $TOKEN")

printf '%s' "$LEAVE" > "$LOG.leave"

python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.leave"))
assert d["ok"] is True
assert d["left"] is True
assert d["viewer_count"] == 0
print("ROOM_LEAVE_OK")
PY

STOP=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3456/api/rooms/me/stop" \
    -H "Authorization: Bearer $TOKEN")

printf '%s' "$STOP" > "$LOG.stop"

python - <<'PY'
import json
d=json.load(open("logs/phase4-test.log.stop"))
assert d["ok"] is True
assert d["room"]["status"] == "INACTIVE"
assert d["room"]["viewer_count"] == 0
print("ROOM_STOP_OK")
PY

sqlite3 data/lexbridge.sqlite \
    "DELETE FROM sessions WHERE user_id='$USER_ID'; DELETE FROM wallets WHERE user_id='$USER_ID'; DELETE FROM rooms WHERE owner_user_id='$USER_ID'; DELETE FROM users WHERE user_id='$USER_ID';"

echo "CLEANUP_OK"
echo "PHASE 4 SUCCESS"
