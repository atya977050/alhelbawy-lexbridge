#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

PASS=0
FAIL=0
WARN=0

ok() {
    PASS=$((PASS + 1))
    printf '  [PASS] %s\n' "$1"
}

fail() {
    FAIL=$((FAIL + 1))
    printf '  [FAIL] %s\n' "$1"
}

warn() {
    WARN=$((WARN + 1))
    printf '  [WARN] %s\n' "$1"
}

section() {
    printf '\n========================================\n'
    printf ' %s\n' "$1"
    printf '========================================\n'
}

require_file() {
    local f="$1"
    if [ -f "$f" ]; then
        ok "FILE $f"
    else
        fail "FILE MISSING $f"
    fi
}

contains() {
    local f="$1"
    local text="$2"
    if grep -Fq "$text" "$f" 2>/dev/null; then
        ok "$3"
    else
        fail "$3"
    fi
}

section "PHASE 1 — ROOMS COMPLETE AUDIT"

printf 'Project: %s\n' "$PROJECT"
printf 'Mode: LOCAL ONLY\n'
printf 'Deploy: NO\n'
printf 'GitHub: NO\n'
printf 'Railway: NO\n'

section "1. REQUIRED FILES"

FILES=(
    "server.js"
    "server/database/db.js"
    "server/database/schema.sql"
    "server/middleware/auth.js"
    "server/routes/auth.js"
    "server/routes/rooms.js"
    "server/routes/room-center.js"
    "server/routes/room-engine.js"
    "server/services/auth-service.js"
    "server/services/session-service.js"
    "server/services/room-service.js"
    "server/services/room-center-service.js"
    "server/services/room-engine-service.js"
    "server/services/room-presence-service.js"
    "server/services/room-seat-service.js"
    "server/services/room-chat-service.js"
    "server/services/room-ad-service.js"
    "server/socket/room-socket.js"
    "server/socket/seat-socket.js"
    "server/socket/webrtc-socket.js"
)

for f in "${FILES[@]}"; do
    require_file "$f"
done

section "2. JAVASCRIPT SYNTAX"

JS_FILES=(
    "server.js"
    "server/middleware/auth.js"
    "server/services/auth-service.js"
    "server/services/session-service.js"
    "server/services/room-service.js"
    "server/services/room-center-service.js"
    "server/services/room-engine-service.js"
    "server/services/room-presence-service.js"
    "server/services/room-seat-service.js"
    "server/services/room-chat-service.js"
    "server/services/room-ad-service.js"
    "server/routes/auth.js"
    "server/routes/rooms.js"
    "server/routes/room-center.js"
    "server/routes/room-engine.js"
    "server/socket/room-socket.js"
    "server/socket/seat-socket.js"
    "server/socket/webrtc-socket.js"
)

for f in "${JS_FILES[@]}"; do
    if [ -f "$f" ]; then
        if node --check "$f" >/dev/null 2>&1; then
            ok "SYNTAX $f"
        else
            fail "SYNTAX $f"
        fi
    fi
done

section "3. DATABASE STRUCTURE"

if [ -f server/database/schema.sql ]; then
    if sqlite3 :memory: < server/database/schema.sql >/dev/null 2>&1; then
        ok "SCHEMA SYNTAX"
    else
        fail "SCHEMA SYNTAX"
    fi
else
    fail "schema.sql missing"
fi

DB="data/lexbridge.sqlite"

if [ -f "$DB" ]; then
    ok "DATABASE EXISTS"

    INTEGRITY="$(sqlite3 "$DB" 'PRAGMA integrity_check;' 2>/dev/null || true)"

    if [ "$INTEGRITY" = "ok" ]; then
        ok "DATABASE INTEGRITY"
    else
        fail "DATABASE INTEGRITY: $INTEGRITY"
    fi

    for table in users rooms room_seats sessions friendships follows visits; do
        if sqlite3 "$DB" \
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='$table';" \
            2>/dev/null | grep -q 1; then
            ok "TABLE $table"
        else
            fail "TABLE MISSING $table"
        fi
    done
else
    fail "DATABASE MISSING: $DB"
fi

section "4. ROOM SCHEMA CONTRACT"

contains "server/database/schema.sql" \
    "CREATE TABLE IF NOT EXISTS rooms" \
    "ROOMS TABLE"

contains "server/database/schema.sql" \
    "room_seats" \
    "ROOM SEATS TABLE"

for field in \
    "host_user_id" \
    "status" \
    "max_viewers" \
    "is_locked" \
    "welcome_message" \
    "cover_image"; do

    if grep -Fq "$field" server/database/schema.sql; then
        ok "ROOM FIELD $field"
    else
        warn "ROOM FIELD NOT FOUND IN SCHEMA: $field"
    fi
done

section "5. SERVER MOUNTING"

contains "server.js" \
    "require('./server/routes/rooms')" \
    "ROOMS ROUTER IMPORT"

contains "server.js" \
    "/api/rooms" \
    "ROOM API MOUNT"

contains "server.js" \
    "room-socket" \
    "ROOM SOCKET"

contains "server.js" \
    "seat-socket" \
    "SEAT SOCKET"

contains "server.js" \
    "webrtc-socket" \
    "WEBRTC SOCKET"

section "6. AUTHENTICATION CONTRACT"

contains "server/middleware/auth.js" \
    "function requireAuth" \
    "REQUIRE AUTH"

contains "server/middleware/auth.js" \
    "getCurrentSession" \
    "SESSION VALIDATION"

contains "server/routes/rooms.js" \
    "requireAuth" \
    "ROOM ROUTES AUTH"

section "7. ROOM SERVICE CONTRACT"

for symbol in \
    "createRoom" \
    "getRoom" \
    "listRooms" \
    "joinRoom" \
    "leaveRoom" \
    "deleteRoom"; do

    if grep -Rqs "$symbol" server/services/room-service.js server/routes/rooms.js; then
        ok "ROOM FUNCTION $symbol"
    else
        warn "ROOM FUNCTION NOT FOUND: $symbol"
    fi
done

section "8. ROOM CENTER"

for symbol in \
    "createRoom" \
    "listRooms" \
    "enterRoom" \
    "leaveRoom"; do

    if grep -Rqs "$symbol" \
        server/services/room-center-service.js \
        server/routes/room-center.js; then
        ok "CENTER FUNCTION $symbol"
    else
        warn "CENTER FUNCTION NOT FOUND: $symbol"
    fi
done

section "9. ROOM ENGINE"

for symbol in \
    "startRoom" \
    "stopRoom" \
    "joinRoom" \
    "leaveRoom" \
    "getRoomState"; do

    if grep -Rqs "$symbol" \
        server/services/room-engine-service.js \
        server/routes/room-engine.js; then
        ok "ENGINE FUNCTION $symbol"
    else
        warn "ENGINE FUNCTION NOT FOUND: $symbol"
    fi
done

section "10. PRESENCE / SEATS / CHAT / ADS"

for pair in \
    "presence:server/services/room-presence-service.js" \
    "seats:server/services/room-seat-service.js" \
    "chat:server/services/room-chat-service.js" \
    "ads:server/services/room-ad-service.js"; do

    name="${pair%%:*}"
    file="${pair#*:}"

    if [ -f "$file" ]; then
        ok "$name SERVICE"
    else
        fail "$name SERVICE MISSING"
    fi
done

section "11. SOCKET CONTRACT"

contains "server/socket/room-socket.js" \
    "join-room" \
    "ROOM JOIN SOCKET"

contains "server/socket/room-socket.js" \
    "leave-room" \
    "ROOM LEAVE SOCKET"

contains "server/socket/room-socket.js" \
    "message" \
    "ROOM MESSAGE SOCKET"

contains "server/socket/seat-socket.js" \
    "seat" \
    "SEAT SOCKET EVENTS"

section "12. FRONTEND ROOM CONTRACT"

if [ -d public ]; then
    ok "PUBLIC DIRECTORY"

    HTML_FILES="$(find public -type f \( -name '*.html' -o -name '*.js' \) | sort)"

    if [ -n "$HTML_FILES" ]; then
        ok "FRONTEND FILES FOUND"
    else
        warn "NO HTML/JS FRONTEND FILES FOUND"
    fi
else
    warn "PUBLIC DIRECTORY NOT FOUND"
fi

if grep -Rqs "room" public 2>/dev/null; then
    ok "FRONTEND ROOM REFERENCES"
else
    warn "NO FRONTEND ROOM REFERENCES FOUND"
fi

section "13. PACKAGE / DEPENDENCIES"

if [ -f package.json ]; then
    node -e "
const p=require('./package.json');
if (!p.dependencies || !p.dependencies.express) process.exit(1);
if (!p.dependencies || !p.dependencies['socket.io']) process.exit(1);
" >/dev/null 2>&1 \
        && ok "EXPRESS + SOCKET.IO" \
        || fail "EXPRESS/SOCKET.IO DEPENDENCY"

    if npm ls --depth=0 >/dev/null 2>&1; then
        ok "NPM DEPENDENCIES"
    else
        warn "NPM DEPENDENCY TREE HAS ISSUES"
    fi
else
    fail "package.json missing"
fi

section "14. GIT SAFETY"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    ok "GIT REPOSITORY PRESENT"

    if git diff --check >/dev/null 2>&1; then
        ok "GIT DIFF CHECK"
    else
        fail "GIT DIFF CHECK"
    fi
else
    warn "NOT A GIT REPOSITORY"
fi

section "15. LOCAL SERVER HEALTH"

if curl -fsS --max-time 3 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    ok "SERVER HTTP 3000"
else
    warn "SERVER NOT RESPONDING ON 3000"
fi

section "16. EXISTING FUNCTIONAL TESTS"

for f in \
    test-phase8.sh \
    test-phase9.js \
    test-phase10.js \
    test-phase11.js; do

    if [ -f "$f" ]; then
        ok "TEST FILE $f"
    else
        warn "TEST FILE NOT PRESENT: $f"
    fi
done

section "17. PHASE 1 RESULT"

printf '\nPASS=%s\n' "$PASS"
printf 'FAIL=%s\n' "$FAIL"
printf 'WARN=%s\n' "$WARN"

if [ "$FAIL" -eq 0 ]; then
    printf '\n========================================\n'
    printf ' PHASE 1 STRUCTURE: READY FOR FULL TEST\n'
    printf '========================================\n'
else
    printf '\n========================================\n'
    printf ' PHASE 1 STRUCTURE: NOT READY\n'
    printf ' FIX FAILURES BEFORE MOVING FORWARD\n'
    printf '========================================\n'
fi

printf '\nNO DEPLOY\n'
printf 'NO GITHUB PUSH\n'
printf 'NO RAILWAY\n'
