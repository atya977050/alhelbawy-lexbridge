#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

echo
echo "========================================"
echo "  PHASE 1 ROOMS — DEEP DIAGNOSTIC"
echo "========================================"
echo "PROJECT: $PROJECT"
echo "MODE: READ ONLY"
echo "NO DELETE"
echo "NO DATABASE WRITE"
echo "NO GITHUB"
echo "NO RAILWAY"
echo

show_file() {
    local title="$1"
    local file="$2"

    echo
    echo "----------------------------------------"
    echo "$title"
    echo "FILE: $file"
    echo "----------------------------------------"

    if [ -f "$file" ]; then
        nl -ba "$file" | sed -n '1,320p'
    else
        echo "MISSING"
    fi
}

show_matches() {
    local title="$1"
    local pattern="$2"

    echo
    echo "----------------------------------------"
    echo "$title"
    echo "PATTERN: $pattern"
    echo "----------------------------------------"

    grep -RniE "$pattern" \
        server.js \
        server/routes \
        server/services \
        server/socket \
        2>/dev/null \
        | head -n 180 || true
}

echo "===== SERVER ROUTER / SOCKET REGISTRATION ====="
grep -nEi \
    "requireAuth|app\.use|router|socket|io\.on|connection|room|seat|webrtc" \
    server.js \
    | head -n 260 || true

echo
echo "===== ROOM ROUTES ====="
show_file "ROOMS ROUTE" "server/routes/rooms.js"

echo
echo "===== ROOM CENTER ROUTE ====="
show_file "ROOM CENTER ROUTE" "server/routes/room-center.js"

echo
echo "===== ROOM ENGINE ROUTE ====="
show_file "ROOM ENGINE ROUTE" "server/routes/room-engine.js"

echo
echo "===== ROOM SERVICE ====="
show_file "ROOM SERVICE" "server/services/room-service.js"

echo
echo "===== ROOM CENTER SERVICE ====="
show_file "ROOM CENTER SERVICE" "server/services/room-center-service.js"

echo
echo "===== ROOM ENGINE SERVICE ====="
show_file "ROOM ENGINE SERVICE" "server/services/room-engine-service.js"

echo
echo "===== ROOM PRESENCE SERVICE ====="
show_file "ROOM PRESENCE SERVICE" "server/services/room-presence-service.js"

echo
echo "===== ROOM SEAT SERVICE ====="
show_file "ROOM SEAT SERVICE" "server/services/room-seat-service.js"

echo
echo "===== ROOM CHAT SERVICE ====="
show_file "ROOM CHAT SERVICE" "server/services/room-chat-service.js"

echo
echo "===== ROOM AD SERVICE ====="
show_file "ROOM AD SERVICE" "server/services/room-ad-service.js"

echo
echo "===== ROOM SOCKET ====="
show_file "ROOM SOCKET" "server/socket/room-socket.js"

echo
echo "===== SEAT SOCKET ====="
show_file "SEAT SOCKET" "server/socket/seat-socket.js"

echo
echo "===== WEBRTC SOCKET ====="
show_file "WEBRTC SOCKET" "server/socket/webrtc-socket.js"

echo
echo "===== ROOM SCHEMA ====="
if [ -f server/database/schema.sql ]; then
    grep -nEi \
        "CREATE TABLE.*rooms|CREATE TABLE.*room_seats|host|status|max_viewers|locked|welcome|cover|seat|presence|ad" \
        server/database/schema.sql \
        | head -n 260 || true
fi

echo
echo "===== ACTUAL DATABASE ROOM COLUMNS ====="
sqlite3 data/lexbridge.sqlite \
    "PRAGMA table_info(rooms);" \
    2>/dev/null || true

echo
echo "===== ACTUAL DATABASE SEAT COLUMNS ====="
sqlite3 data/lexbridge.sqlite \
    "PRAGMA table_info(room_seats);" \
    2>/dev/null || true

echo
echo "===== ROOM SOCKET EVENT NAMES ====="
grep -RniE \
    "socket\.on|socket\.emit|io\.to|io\.emit|join\(|leave\(" \
    server/socket \
    2>/dev/null \
    | head -n 260 || true

echo
echo "===== ROOM API ENDPOINTS ====="
grep -RniE \
    "router\.(get|post|put|patch|delete)|router\.use" \
    server/routes/rooms.js \
    server/routes/room-center.js \
    server/routes/room-engine.js \
    2>/dev/null \
    | head -n 260 || true

echo
echo "===== GIT DIFF CHECK ====="
git diff --check || true

echo
echo "===== MODIFIED FILES ====="
git status --short

echo
echo "========================================"
echo "  DIAGNOSTIC COMPLETE"
echo "========================================"
echo "READ ONLY"
echo "NO DEPLOY"
echo "NO GITHUB PUSH"
echo "NO RAILWAY"
