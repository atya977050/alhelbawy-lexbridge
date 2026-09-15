#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

PASS=0
FAIL=0
WARN=0

ok(){ echo "✅ $1"; PASS=$((PASS+1)); }
fail(){ echo "❌ $1"; FAIL=$((FAIL+1)); }
warn(){ echo "⚠️ $1"; WARN=$((WARN+1)); }

echo "=================================================="
echo "   الهلباوى LEXBRIDGE — FINAL LOCAL AUDIT"
echo "=================================================="
echo "PROJECT: $PROJECT"
echo "NO DEPLOY"
echo "NO GITHUB PUSH"
echo "NO RAILWAY"
echo "=================================================="

echo
echo "=== 1. CORE FILES ==="

FILES=(
server.js
package.json
public/index.html
public/room.html
server/middleware/auth.js
server/database/db.js
server/database/init.js
server/routes/auth.js
server/routes/accounts.js
server/routes/me.js
server/routes/profile.js
server/routes/rooms.js
server/routes/room-center.js
server/routes/room-engine.js
server/routes/social.js
server/routes/activity.js
server/routes/messages.js
server/routes/wallet.js
server/routes/features.js
server/services/account-service.js
server/services/auth-service.js
server/services/me-service.js
server/services/profile-service.js
server/services/room-service.js
server/services/room-center-service.js
server/services/room-engine-service.js
server/services/room-presence-service.js
server/services/room-seat-service.js
server/services/room-chat-service.js
server/services/room-ad-service.js
server/services/session-service.js
server/services/social-service.js
server/services/activity-service.js
server/services/message-service.js
server/services/wallet-service.js
server/services/feature-service.js
server/socket/room-socket.js
server/socket/seat-socket.js
server/socket/webrtc-socket.js
)

for f in "${FILES[@]}"; do
    if [ -f "$f" ]; then
        ok "FILE $f"
    else
        fail "MISSING $f"
    fi
done

echo
echo "=== 2. MIGRATIONS ==="

for f in server/database/migrations/*.sql database/migrations/*.sql; do
    [ -e "$f" ] || continue
    ok "MIGRATION $f"
done

echo
echo "=== 3. PACKAGE / SYNTAX ==="

if node --check server.js >/dev/null 2>&1; then
    ok "JS SYNTAX server.js"
else
    fail "JS SYNTAX server.js"
fi

for f in public/index.html public/room.html; do
    if python - "$f" <<'PY'
import re, subprocess, sys

p=sys.argv[1]
s=open(p,encoding="utf-8").read()
blocks=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,re.S|re.I)

for i,b in enumerate(blocks):
    if not b.strip():
        continue
    q=f"/data/data/com.termux/files/usr/tmp_check_{i}.js"
    open(q,"w",encoding="utf-8").write(b)
    r=subprocess.run(["node","--check",q],
                     stdout=subprocess.DEVNULL,
                     stderr=subprocess.DEVNULL)
    if r.returncode:
        raise SystemExit(1)
PY
    then
        ok "JS SYNTAX $f"
    else
        fail "JS SYNTAX $f"
    fi
done

echo
echo "=== 4. FRONTEND MODULE MARKERS ==="

MARKERS=(
"VIP1"
"VIP2"
"VIP3"
"VIP4"
"VIP5"
"VIP6"
"MESSAGES_CENTER_READY"
"ME_CENTER_READY"
"MY_ROOM_CENTER_READY"
"ACTIVITY_FRONTEND_READY"
"lexBridgeGlobalBack"
"wallet"
"feature"
)

for m in "${MARKERS[@]}"; do
    if grep -Rqs "$m" public/index.html public/room.html; then
        ok "FRONTEND $m"
    else
        fail "FRONTEND MISSING $m"
    fi
done

echo
echo "=== 5. ROOM / REALTIME ==="

ROOM_CHECKS=(
"room:state"
"room:updated"
"room:presence"
"seat:request"
"seat:accept"
"seat:reject"
"seat:leave"
"seat:media"
)

for x in "${ROOM_CHECKS[@]}"; do
    if grep -Rqs "$x" server public; then
        ok "ROOM EVENT $x"
    else
        fail "ROOM EVENT MISSING $x"
    fi
done

echo
echo "=== 6. WEBRTC SIGNALING ==="

WEBRTC_CHECKS=(
"webrtc"
"offer"
"answer"
"ice"
)

for x in "${WEBRTC_CHECKS[@]}"; do
    if grep -Rqi "$x" server/socket/webrtc-socket.js public/room.html; then
        ok "WEBRTC $x"
    else
        fail "WEBRTC MISSING $x"
    fi
done

echo
echo "=== 7. API ROUTES ==="

ROUTES=(
"/api/auth"
"/api/me"
"/api/profile"
"/api/rooms"
"/api/room-center"
"/api/social"
"/api/activity"
"/api/messages"
"/api/wallet"
"/api/features"
)

for x in "${ROUTES[@]}"; do
    if grep -Rqs "$x" server; then
        ok "ROUTE $x"
    else
        warn "ROUTE STRING NOT FOUND $x"
    fi
done

echo
echo "=== 8. DATABASE ==="

if [ -f data/database.sqlite ]; then
    ok "SQLITE DATABASE EXISTS"
elif find . -type f \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" \) | grep -q .; then
    ok "SQLITE DATABASE EXISTS"
else
    warn "DATABASE FILE NOT FOUND IN STANDARD LOCATIONS"
fi

if command -v sqlite3 >/dev/null 2>&1; then
    DB="$(find . -type f \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" \) | head -n1 || true)"
    if [ -n "$DB" ]; then
        if sqlite3 "$DB" "PRAGMA integrity_check;" 2>/dev/null | grep -qx "ok"; then
            ok "SQLITE INTEGRITY OK"
        else
            fail "SQLITE INTEGRITY FAILED"
        fi
    fi
else
    warn "sqlite3 CLI NOT INSTALLED"
fi

echo
echo "=== 9. EXISTING TESTS ==="

for t in test-phase8.sh test-phase9.js; do
    if [ -f "$t" ]; then
        ok "TEST EXISTS $t"
    else
        warn "TEST MISSING $t"
    fi
done

echo
echo "=== 10. GIT SAFETY CHECK ==="

if git diff --check >/dev/null 2>&1; then
    ok "git diff --check"
else
    fail "git diff --check"
fi

if git status --porcelain | grep -q .; then
    echo "ℹ️ LOCAL CHANGES EXIST — NOT PUSHING"
else
    ok "WORKTREE CLEAN"
fi

echo
echo "=================================================="
echo "   RESULT"
echo "=================================================="
echo "PASS = $PASS"
echo "FAIL = $FAIL"
echo "WARN = $WARN"

if [ "$FAIL" -eq 0 ]; then
    echo
    echo "✅ FINAL LOCAL AUDIT PASSED"
    echo "✅ NO DEPLOY"
    echo "✅ NO GITHUB PUSH"
    echo "✅ NO RAILWAY"
    exit 0
else
    echo
    echo "❌ FINAL LOCAL AUDIT FOUND FAILURES"
    exit 1
fi
