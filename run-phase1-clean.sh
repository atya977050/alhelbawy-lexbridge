#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
SERVER="$PROJECT/server.js"
TEST="$PROJECT/test-phase1-rooms-full.sh"

cd "$PROJECT"

PASS=0

fail() {
    echo
    echo "ERROR: $1"
    echo "STOP"
    exit 1
}

echo
echo "========================================"
echo " الهلباوى lexbridge"
echo " PHASE 1 — CLEAN HARDENED RUNNER"
echo "========================================"

echo
echo "===== 1. PROJECT CHECK ====="

[ -d "$PROJECT" ] || fail "PROJECT_NOT_FOUND"
[ -f "$SERVER" ] || fail "SERVER_NOT_FOUND"
[ -f "$TEST" ] || fail "TEST_NOT_FOUND"

echo "PASS: project"
echo "PASS: server.js"
echo "PASS: phase1 test"

echo
echo "===== 2. SERVER SYNTAX ====="

node --check "$SERVER" >/dev/null 2>&1 \
    || fail "SERVER_SYNTAX_ERROR"

echo "PASS: server syntax"

echo
echo "===== 3. SERVER PORT ====="

PORT="$(
    sed -n \
    's/^[[:space:]]*const PORT = process\.env\.PORT || \([0-9][0-9]*\);/\1/p' \
    "$SERVER" |
    head -n 1
)"

[ -n "$PORT" ] || fail "SERVER_DEFAULT_PORT_NOT_FOUND"

echo "SERVER_DEFAULT_PORT=$PORT"

echo
echo "===== 4. PHASE1 TEST PORT ====="

TEST_PORT="$(
    sed -n \
    's/^PORT=\([0-9][0-9]*\)$/\1/p' \
    "$TEST" |
    head -n 1
)"

[ -n "$TEST_PORT" ] || fail "TEST_PORT_NOT_FOUND"

echo "TEST_PORT=$TEST_PORT"

if [ "$TEST_PORT" != "$PORT" ]; then
    echo "FIXING_TEST_PORT: $TEST_PORT -> $PORT"

    TEST_FILE="$TEST" TARGET_PORT="$PORT" python - <<'PY2'
from pathlib import Path
import os

p = Path(os.environ["TEST_FILE"])
port = os.environ["TARGET_PORT"]

lines = p.read_text().splitlines()

for i, line in enumerate(lines):
    if line.startswith("PORT="):
        lines[i] = f"PORT={port}"
        break
else:
    raise SystemExit("PORT_LINE_NOT_FOUND")

p.write_text("\n".join(lines) + "\n")
print("TEST_PORT_FIXED")
PY2
else
    echo "PASS: test port matches server"
fi

echo
echo "===== 5. TEST SYNTAX ====="

bash -n "$TEST" || fail "PHASE1_TEST_SYNTAX_ERROR"

echo "PASS: phase1 test syntax"

echo
echo "===== 6. PORT SAFETY ====="

PORT_PID="$(
    lsof -ti :"$PORT" 2>/dev/null |
    head -n 1 || true
)"

if [ -n "$PORT_PID" ]; then
    CMD="$(ps -p "$PORT_PID" -o args= 2>/dev/null || true)"

    echo "PORT_PID=$PORT_PID"
    echo "PORT_CMD=$CMD"

    case "$CMD" in
        *"$SERVER"*)
            echo "PASS: port belongs to LexBridge"
            kill "$PORT_PID" 2>/dev/null || true
            sleep 2
            ;;
        *)
            fail "PORT_${PORT}_USED_BY_OTHER_PROCESS"
            ;;
    esac
else
    echo "PASS: port is free"
fi

echo
echo "===== 7. VERIFY PORT FREE ====="

if lsof -ti :"$PORT" >/dev/null 2>&1; then
    fail "PORT_STILL_BUSY"
fi

echo "PASS: port $PORT is free"

echo
echo "===== 8. TEST USER ====="

USER_ID="$(
    sqlite3 "$PROJECT/data/lexbridge.sqlite" \
    "SELECT user_id FROM users WHERE username='atya' LIMIT 1;" \
    2>/dev/null || true
)"

[ -n "$USER_ID" ] || fail "TEST_USER_NOT_FOUND"

echo "PASS: test user"

echo
echo "===== 9. RUN PHASE 1 ====="

TEST_USER_ID="$USER_ID" "$TEST"

echo
echo "========================================"
echo " PHASE 1 RUNNER FINISHED"
echo "========================================"
echo "NO GITHUB"
echo "NO RAILWAY"
echo "NO DEPLOY"
echo "NO DELETE"
