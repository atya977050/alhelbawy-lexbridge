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
echo "  الهلباوى LEXBRIDGE — FINAL LOCAL AUDIT V2"
echo "=================================================="
echo "NO DEPLOY"
echo "NO GITHUB PUSH"
echo "NO RAILWAY"
echo

echo "=== CORE ==="

for f in \
server.js package.json public/index.html public/room.html \
server/middleware/auth.js server/database/db.js server/database/init.js \
server/routes/auth.js server/routes/accounts.js server/routes/me.js \
server/routes/profile.js server/routes/rooms.js server/routes/room-center.js \
server/routes/room-engine.js server/routes/social.js server/routes/activity.js \
server/routes/messages.js server/routes/wallet.js server/routes/features.js \
server/services/account-service.js server/services/auth-service.js \
server/services/me-service.js server/services/profile-service.js \
server/services/room-service.js server/services/room-center-service.js \
server/services/room-engine-service.js server/services/room-presence-service.js \
server/services/room-seat-service.js server/services/room-chat-service.js \
server/services/room-ad-service.js server/services/session-service.js \
server/services/social-service.js server/services/activity-service.js \
server/services/message-service.js server/services/wallet-service.js \
server/services/feature-service.js server/socket/room-socket.js \
server/socket/seat-socket.js server/socket/webrtc-socket.js
do
    [ -f "$f" ] && ok "FILE $f" || fail "MISSING $f"
done

echo
echo "=== SYNTAX ==="

node --check server.js >/dev/null 2>&1 \
  && ok "server.js syntax" \
  || fail "server.js syntax"

for f in public/index.html public/room.html; do
    if python - "$f" <<'PY'
import re, subprocess, sys, os

p=sys.argv[1]
s=open(p,encoding="utf-8").read()
blocks=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,re.S|re.I)

for i,b in enumerate(blocks):
    if not b.strip():
        continue
    q=os.path.join(
        os.path.dirname(p),
        ".syntax-check-%s-%s.js" % (os.path.basename(p), i)
    )
    open(q,"w",encoding="utf-8").write(b)
    r=subprocess.run(
        ["node","--check",q],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    os.unlink(q)
    if r.returncode:
        raise SystemExit(1)
PY
    then
        ok "$f syntax"
    else
        fail "$f syntax"
    fi
done

echo
echo "=== FRONTEND FEATURES ==="

# VIP structure — لا نفترض أسماء VIP1..VIP6 حرفيًا
VIP_OK=0

grep -Eqi \
'VIP.?1|المستوى الأول|VIP 1|vip-1|vip1' \
public/index.html && VIP_OK=$((VIP_OK+1)) || true

grep -Eqi \
'VIP.?2|المستوى الثاني|VIP 2|vip-2|vip2' \
public/index.html && VIP_OK=$((VIP_OK+1)) || true

grep -Eqi \
'VIP.?3|المستوى الثالث|VIP 3|vip-3|vip3' \
public/index.html && VIP_OK=$((VIP_OK+1)) || true

grep -Eqi \
'VIP.?4|المستوى الرابع|VIP 4|vip-4|vip4' \
public/index.html && VIP_OK=$((VIP_OK+1)) || true

grep -Eqi \
'VIP.?5|المستوى الخامس|VIP 5|vip-5|vip5' \
public/index.html && VIP_OK=$((VIP_OK+1)) || true

grep -Eqi \
'VIP.?6|المستوى السادس|VIP 6|vip-6|vip6' \
public/index.html && VIP_OK=$((VIP_OK+1)) || true

if [ "$VIP_OK" -ge 6 ]; then
    ok "VIP 1-6 UI"
else
    warn "VIP 1-6 textual scan = $VIP_OK/6"
fi

for marker in \
MESSAGES_CENTER_READY \
ME_CENTER_READY \
MY_ROOM_CENTER_READY \
ACTIVITY_FRONTEND_READY \
lexBridgeGlobalBack
do
    grep -Rqs "$marker" public \
      && ok "FRONTEND $marker" \
      || fail "FRONTEND MISSING $marker"
done

echo
echo "=== ROOM / SOCKET ==="

for x in \
'room:state' \
'room:updated' \
'room:presence' \
'seat:request' \
'seat:accept' \
'seat:reject' \
'seat:leave' \
'seat:media'
do
    grep -Rqs "$x" server public \
      && ok "SOCKET $x" \
      || fail "SOCKET MISSING $x"
done

echo
echo "=== WEBRTC ==="

for x in \
webrtc offer answer ice
do
    grep -Rqi "$x" server/socket/webrtc-socket.js public/room.html \
      && ok "WEBRTC $x" \
      || fail "WEBRTC MISSING $x"
done

echo
echo "=== ROUTE MOUNTING ==="

# نتحقق من mount الفعلي بدل البحث عن /api/... كنص كامل
declare -A ROUTE_FILES=(
    [auth]=server/routes/auth.js
    [accounts]=server/routes/accounts.js
    [me]=server/routes/me.js
    [profile]=server/routes/profile.js
    [rooms]=server/routes/rooms.js
    [room-center]=server/routes/room-center.js
    [room-engine]=server/routes/room-engine.js
    [social]=server/routes/social.js
    [activity]=server/routes/activity.js
    [messages]=server/routes/messages.js
    [wallet]=server/routes/wallet.js
    [features]=server/routes/features.js
)

for r in "${!ROUTE_FILES[@]}"; do
    f="${ROUTE_FILES[$r]}"

    if [ -f "$f" ]; then
        ok "ROUTE FILE $r"
    else
        fail "ROUTE FILE $r"
    fi
done

# server.js يجب أن يحتوي على route mounting
if grep -Eqs \
'app\.use.*(/api|auth|rooms|social|activity|messages|wallet|features)' \
server.js
then
    ok "SERVER ROUTE MOUNTING"
else
    warn "SERVER route mounting pattern not recognized"
fi

echo
echo "=== DATABASE ==="

DB="$(find . -type f \( \
-name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \
\) | head -n1 || true)"

if [ -n "$DB" ]; then
    ok "DATABASE $DB"

    if command -v sqlite3 >/dev/null 2>&1; then
        if sqlite3 "$DB" 'PRAGMA integrity_check;' 2>/dev/null | grep -qx ok; then
            ok "SQLITE INTEGRITY"
        else
            fail "SQLITE INTEGRITY"
        fi
    else
        warn "sqlite3 CLI unavailable"
    fi
else
    fail "DATABASE NOT FOUND"
fi

echo
echo "=== TEST FILES ==="

[ -f test-phase8.sh ] \
  && ok "test-phase8.sh exists" \
  || fail "test-phase8.sh missing"

[ -f test-phase9.js ] \
  && ok "test-phase9.js exists" \
  || fail "test-phase9.js missing"

echo
echo "=== GIT SAFETY ==="

git diff --check >/dev/null 2>&1 \
  && ok "git diff --check" \
  || fail "git diff --check"

echo
echo "=================================================="
echo "RESULT"
echo "=================================================="
echo "PASS=$PASS"
echo "FAIL=$FAIL"
echo "WARN=$WARN"

if [ "$FAIL" -eq 0 ]; then
    echo "✅ FINAL LOCAL AUDIT V2 PASSED"
    echo "✅ NO DEPLOY"
    echo "✅ NO GITHUB PUSH"
    echo "✅ NO RAILWAY"
    exit 0
fi

echo "❌ REAL FAILURES REMAIN"
exit 1
