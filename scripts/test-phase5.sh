#!/data/data/com.termux/files/usr/bin/bash
set -e

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

LOG="$PROJECT/logs/phase5-test.log"

rm -f "$LOG" \
      "$LOG.server" \
      "$LOG.health" \
      "$LOG.register" \
      "$LOG.login" \
      "$LOG.me" \
      "$LOG.profile"

echo "PHASE 5 FUNCTIONAL TEST" | tee "$LOG"

node --check server.js
node --check server/services/me-service.js
node --check server/routes/me.js

echo "SYNTAX_OK" | tee -a "$LOG"

PORT=3457 node server.js > "$LOG.server" 2>&1 &
SERVER_PID=$!

cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT

sleep 2

# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

curl -fsS \
    "http://127.0.0.1:3457/api/health" \
    > "$LOG.health"

python - <<'PY'
import json

data = json.load(
    open("logs/phase5-test.log.health")
)

assert data["ok"] is True
assert data["database"] == "ok"

print("HEALTH_OK")
PY

# ---------------------------------------------------------
# Register
# ---------------------------------------------------------

USERNAME="phase5_$(date +%s)"
PASSWORD="Phase5Password123"

REGISTER=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3457/api/accounts/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"displayName\":\"اختبار شاشة أنا\",\"password\":\"$PASSWORD\"}")

printf '%s' "$REGISTER" > "$LOG.register"

python - <<'PY'
import json

data = json.load(
    open("logs/phase5-test.log.register")
)

assert data["ok"] is True
assert data["account"]["user"]["user_id"]
assert data["account"]["room"]["room_id"]
assert data["account"]["wallet"]["wallet_id"]

print("REGISTER_OK")
PY

# ---------------------------------------------------------
# Login
# ---------------------------------------------------------

LOGIN=$(curl -fsS \
    -X POST \
    "http://127.0.0.1:3457/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

printf '%s' "$LOGIN" > "$LOG.login"

TOKEN=$(python - <<'PY'
import json

data = json.load(
    open("logs/phase5-test.log.login")
)

assert data["ok"] is True

print(
    data["session"]["token"]
)
PY
)

USER_ID=$(python - <<'PY'
import json

data = json.load(
    open("logs/phase5-test.log.login")
)

print(
    data["user"]["user_id"]
)
PY
)

echo "LOGIN_OK"

# ---------------------------------------------------------
# GET /api/me
# ---------------------------------------------------------

ME=$(curl -fsS \
    -H "Authorization: Bearer $TOKEN" \
    "http://127.0.0.1:3457/api/me")

printf '%s' "$ME" > "$LOG.me"

python - <<'PY'
import json

data = json.load(
    open("logs/phase5-test.log.me")
)

assert data["ok"] is True

d = data["data"]

assert d["user"]["user_id"]
assert d["user"]["username"]
assert d["user"]["display_name"]

assert "friends" in d["stats"]
assert "following" in d["stats"]
assert "followers" in d["stats"]
assert "visitors" in d["stats"]
assert "total_visits" in d["stats"]

assert d["stats"]["friends"] == 0
assert d["stats"]["following"] == 0
assert d["stats"]["followers"] == 0
assert d["stats"]["visitors"] == 0

assert d["room"]
assert d["room"]["room_id"]

assert d["wallet"]
assert d["wallet"]["currency"] == "EGP"
assert d["wallet"]["available_minor"] == 0

print("ME_DATA_OK")
PY

# ---------------------------------------------------------
# Auth protection
# ---------------------------------------------------------

STATUS=$(curl -s \
    -o "$LOG.profile" \
    -w "%{http_code}" \
    "http://127.0.0.1:3457/api/me")

[ "$STATUS" = "401" ]

echo "AUTH_PROTECTION_OK"

# ---------------------------------------------------------
# Profile still works
# ---------------------------------------------------------

PROFILE=$(curl -fsS \
    -H "Authorization: Bearer $TOKEN" \
    "http://127.0.0.1:3457/api/profile/me")

printf '%s' "$PROFILE" > "$LOG.profile"

python - <<'PY'
import json

data = json.load(
    open("logs/phase5-test.log.profile")
)

assert data["ok"] is True

profile = data["profile"]

if "user_id" in profile:
    assert profile["user_id"]
elif "user" in profile:
    assert profile["user"]["user_id"]
else:
    raise AssertionError("PROFILE_SHAPE_UNEXPECTED")

print("PROFILE_REGRESSION_OK")
PY

# ---------------------------------------------------------
# Cleanup
# ---------------------------------------------------------

sqlite3 data/lexbridge.sqlite \
    "DELETE FROM sessions WHERE user_id='$USER_ID';
     DELETE FROM wallets WHERE user_id='$USER_ID';
     DELETE FROM rooms WHERE owner_user_id='$USER_ID';
     DELETE FROM users WHERE user_id='$USER_ID';"

REMAINING=$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM users
     WHERE user_id='$USER_ID';")

[ "$REMAINING" = "0" ]

echo "CLEANUP_OK"

echo
echo "========================================"
echo " PHASE 5 SUCCESS"
echo "========================================"
