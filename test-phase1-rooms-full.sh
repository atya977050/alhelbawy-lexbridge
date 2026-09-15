#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
cd "$PROJECT"

PORT=3000
BASE="http://127.0.0.1:$PORT"

PASS=0
FAIL=0
SERVER_PID=""

cleanup() {
    if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

pass() {
    PASS=$((PASS+1))
    echo "PASS: $1"
}

fail() {
    FAIL=$((FAIL+1))
    echo "FAIL: $1"
}

echo
echo "========================================"
echo " PHASE 1 ROOMS — FULL FUNCTIONAL TEST"
echo "========================================"
echo "PROJECT: $PROJECT"
echo "PORT: $PORT"
echo "NO DELETE"
echo "NO GITHUB"
echo "NO RAILWAY"
echo "NO DEPLOY"
echo

echo "===== 1. SYNTAX ====="

for f in \
    server.js \
    server/database/db.js \
    server/middleware/auth.js \
    server/routes/auth.js \
    server/routes/rooms.js \
    server/routes/room-center.js \
    server/routes/room-engine.js \
    server/services/room-service.js \
    server/services/room-center-service.js \
    server/services/room-engine-service.js \
    server/services/room-presence-service.js \
    server/services/room-seat-service.js \
    server/services/room-chat-service.js \
    server/services/room-ad-service.js \
    server/socket/room-socket.js \
    server/socket/seat-socket.js \
    server/socket/webrtc-socket.js
do
    if node --check "$f" >/dev/null 2>&1; then
        pass "syntax: $f"
    else
        fail "syntax: $f"
    fi
done

echo
echo "===== 2. DATABASE ====="

if sqlite3 data/lexbridge.sqlite "PRAGMA integrity_check;" 2>/dev/null | grep -qx "ok"; then
    pass "database integrity"
else
    fail "database integrity"
fi

ROOM_COLUMNS="$(sqlite3 data/lexbridge.sqlite "PRAGMA table_info(rooms);" 2>/dev/null || true)"

for col in room_id owner_user_id name status welcome_message cover_image max_viewers is_locked; do
    if printf '%s\n' "$ROOM_COLUMNS" | grep -q "$col"; then
        pass "rooms column: $col"
    else
        fail "rooms column missing: $col"
    fi
done

SEAT_COLUMNS="$(sqlite3 data/lexbridge.sqlite "PRAGMA table_info(room_seats);" 2>/dev/null || true)"

for col in seat_id room_id seat_number user_id status mic_enabled camera_enabled joined_at; do
    if printf '%s\n' "$SEAT_COLUMNS" | grep -q "$col"; then
        pass "room_seats column: $col"
    else
        fail "room_seats column missing: $col"
    fi
done

echo
echo "===== 3. START ISOLATED LOCAL SERVER ====="

node server.js > phase1-test-server.log 2>&1 &
SERVER_PID=$!

READY=0

for i in $(seq 1 30); do
    if curl -fsS "$BASE/" >/dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 0.5
done

if [ "$READY" = "1" ]; then
    pass "HTTP server started"
else
    fail "HTTP server did not start"
    cat phase1-test-server.log || true
    exit 1
fi

echo
echo "===== 4. EXISTING USER ====="

USER_ID="$(sqlite3 data/lexbridge.sqlite \
    "SELECT user_id FROM users WHERE username='atya' LIMIT 1;" \
    2>/dev/null || true)"

if [ -n "$USER_ID" ]; then
    pass "existing test user found"
else
    fail "test user atya not found"
    exit 1
fi

echo
echo "===== 5. ROOM SERVICE DIRECT TEST ====="

node <<'NODE'
const room = require('./server/services/room-service');

const userId = process.env.TEST_USER_ID;

if (!userId) {
    throw new Error('TEST_USER_ID missing');
}

const r = room.createRoomForUser(userId, 'عطيه');

if (!r || !r.room_id) {
    throw new Error('ROOM_CREATE_FAILED');
}

if (r.owner_user_id !== userId) {
    throw new Error('ROOM_OWNER_INVALID');
}

if (!r.name) {
    throw new Error('ROOM_NAME_INVALID');
}

console.log('ROOM_CREATE_OK');
console.log('ROOM_ID=' + r.room_id);
NODE

ROOM_ID="$(sqlite3 data/lexbridge.sqlite \
    "SELECT room_id FROM rooms WHERE owner_user_id='$USER_ID' LIMIT 1;" \
    2>/dev/null || true)"

if [ -n "$ROOM_ID" ]; then
    pass "room created/retrieved"
else
    fail "room create/retrieve"
    exit 1
fi

export TEST_USER_ID="$USER_ID"
export TEST_ROOM_ID="$ROOM_ID"

echo
echo
echo "===== 6. ROOM ENGINE START + STATE ====="

ENGINE_STATE_FILE="$PROJECT/.phase1-engine-state"

TEST_USER_ID="$USER_ID" TEST_ROOM_ID="$ROOM_ID" ENGINE_STATE_FILE="$ENGINE_STATE_FILE" node <<'NODE'
const fs = require('fs');
const engine = require('./server/services/room-engine-service');

const userId = process.env.TEST_USER_ID;
const roomId = process.env.TEST_ROOM_ID;

if (!userId) throw new Error('TEST_USER_ID missing');
if (!roomId) throw new Error('TEST_ROOM_ID missing');

const state = engine.start(userId);

if (!state || !state.room) throw new Error('ENGINE_START_NO_ROOM');
if (state.room.room_id !== roomId) throw new Error('ENGINE_ROOM_MISMATCH');
if (state.room.status !== 'LIVE') throw new Error('ROOM_NOT_LIVE');
if (!state.engine.active) throw new Error('ENGINE_NOT_ACTIVE');
if (state.engine.hostUserId !== userId) throw new Error('HOST_INVALID');

const state2 = engine.getEngineState(roomId);

if (!state2.room) throw new Error('STATE_NO_ROOM');
if (!state2.engine) throw new Error('STATE_NO_ENGINE');
if (!state2.engine.active) throw new Error('ENGINE_STATE_INACTIVE');
if (state2.engine.hostUserId !== userId) throw new Error('STATE_HOST_INVALID');

fs.writeFileSync(
    process.env.ENGINE_STATE_FILE,
    JSON.stringify({
        roomId,
        active: state2.engine.active,
        hostUserId: state2.engine.hostUserId
    })
);

console.log('ENGINE_START_OK');
console.log('ENGINE_STATE_OK');
console.log('ROOM_ID=' + roomId);
NODE

if [ -f "$ENGINE_STATE_FILE" ]; then
    pass "room engine start"
    pass "room engine state"
else
    fail "room engine start/state"
fi

echo "===== 7. ROOM DATABASE LIVE STATE ====="

STATUS="$(sqlite3 data/lexbridge.sqlite \
    "SELECT status FROM rooms WHERE room_id='$ROOM_ID' LIMIT 1;" \
    2>/dev/null || true)"

if [ "$STATUS" = "LIVE" ]; then
    pass "room status LIVE"
else
    fail "room status is $STATUS"
fi

echo
echo "===== 8. SEATS ====="

SEAT_COUNT="$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM room_seats WHERE room_id='$ROOM_ID';" \
    2>/dev/null || echo 0)"

if [ "$SEAT_COUNT" = "12" ]; then
    pass "12 seats initialized"
else
    fail "seat count expected 12, got $SEAT_COUNT"
fi

EMPTY_SEATS="$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM room_seats WHERE room_id='$ROOM_ID' AND status='EMPTY';" \
    2>/dev/null || echo 0)"

if [ "$EMPTY_SEATS" = "12" ]; then
    pass "all seats initially empty"
else
    fail "initial seat state"
fi

echo
echo
echo "===== 10. ROOM CENTER ====="

if TEST_USER_ID="$USER_ID" node <<'NODE'
const center = require('./server/services/room-center-service');

const result = center.getRoomCenter(process.env.TEST_USER_ID);

if (!result.room) throw new Error('CENTER_NO_ROOM');
if (result.room.status !== 'LIVE') throw new Error('CENTER_ROOM_NOT_LIVE');

console.log('ROOM_CENTER_OK');
NODE
then
    pass "room center"
else
    fail "room center"
fi

echo
echo "===== 11. PRESENCE ====="

if TEST_ROOM_ID="$ROOM_ID" TEST_USER_ID="$USER_ID" node <<'NODE'
const presence = require('./server/services/room-presence-service');

presence.enterRoom(
    process.env.TEST_ROOM_ID,
    process.env.TEST_USER_ID
);

const count = presence.getViewerCount(
    process.env.TEST_ROOM_ID
);

if (count < 1) throw new Error('PRESENCE_NOT_REGISTERED');

console.log('PRESENCE_OK');
console.log('VIEWERS=' + count);

presence.leaveRoom(
    process.env.TEST_ROOM_ID,
    process.env.TEST_USER_ID
);
NODE
then
    pass "presence enter/leave"
else
    fail "presence enter/leave"
fi

echo
echo "===== 12. CHAT ====="

if TEST_ROOM_ID="$ROOM_ID" TEST_USER_ID="$USER_ID" node <<'NODE'
const chat = require('./server/services/room-chat-service');

const text = 'PHASE1_ROOM_CHAT_TEST';

const message = chat.addMessage(
    process.env.TEST_ROOM_ID,
    process.env.TEST_USER_ID,
    text
);

if (!message) throw new Error('CHAT_MESSAGE_NOT_CREATED');
if (message.message !== text) throw new Error('CHAT_MESSAGE_INVALID');

const messages = chat.getMessages(
    process.env.TEST_ROOM_ID,
    20
);

if (!messages.some(x => x.message === text)) {
    throw new Error('CHAT_MESSAGE_NOT_FOUND');
}

console.log('CHAT_OK');
NODE
then
    pass "room chat"
else
    fail "room chat"
fi

echo
echo "===== 13. ADS ====="

if TEST_ROOM_ID="$ROOM_ID" node <<'NODE'
const ads = require('./server/services/room-ad-service');

const ad = ads.addRoomAd(
    process.env.TEST_ROOM_ID,
    'PHASE1 TEST AD',
    'PHASE1 ROOM AD TEST'
);

if (!ad) throw new Error('AD_NOT_CREATED');

const list = ads.getRoomAds(
    process.env.TEST_ROOM_ID
);

if (!list.some(x => x.title === 'PHASE1 TEST AD')) {
    throw new Error('AD_NOT_FOUND');
}

console.log('ADS_OK');
NODE
then
    pass "room ads"
else
    fail "room ads"
fi

echo
echo "===== 14. ROOM UPDATE ====="

if TEST_ROOM_ID="$ROOM_ID" TEST_USER_ID="$USER_ID" node <<'NODE'
const room = require('./server/services/room-service');

const updated = room.updateRoom(
    process.env.TEST_ROOM_ID,
    process.env.TEST_USER_ID,
    {
        description: 'PHASE1 TEST DESCRIPTION',
        welcomeMessage: 'PHASE1 TEST WELCOME',
        maxViewers: 100,
        isLocked: false
    }
);

if (!updated) throw new Error('UPDATE_FAILED');

if (updated.description !== 'PHASE1 TEST DESCRIPTION') {
    throw new Error('DESCRIPTION_NOT_UPDATED');
}

console.log('ROOM_UPDATE_OK');
NODE
then
    pass "room update"
else
    fail "room update"
fi

echo
echo "===== 15. ROOM STOP / CLEANUP ====="

if TEST_USER_ID="$USER_ID" node <<'NODE'
const engine = require('./server/services/room-engine-service');

const result = engine.stop(
    process.env.TEST_USER_ID
);

if (!result || !result.room) {
    throw new Error('STOP_NO_RESULT');
}

if (result.room.status !== 'INACTIVE') {
    throw new Error('ROOM_NOT_INACTIVE');
}

if (result.engine.active) {
    throw new Error('ENGINE_STILL_ACTIVE');
}

console.log('ENGINE_STOP_OK');
NODE
then
    pass "room engine stop"
else
    fail "room engine stop"
fi

echo
echo "===== 16. FINAL CLEAN STATE ====="

FINAL_STATUS="$(sqlite3 data/lexbridge.sqlite \
    "SELECT status FROM rooms WHERE room_id='$ROOM_ID' LIMIT 1;" \
    2>/dev/null || true)"

FINAL_SEATS="$(sqlite3 data/lexbridge.sqlite \
    "SELECT COUNT(*) FROM room_seats WHERE room_id='$ROOM_ID' AND status='EMPTY';" \
    2>/dev/null || echo 0)"

if [ "$FINAL_STATUS" = "INACTIVE" ]; then
    pass "final room INACTIVE"
else
    fail "final room status: $FINAL_STATUS"
fi

if [ "$FINAL_SEATS" = "12" ]; then
    pass "final seats cleared"
else
    fail "final seats not cleared: $FINAL_SEATS"
fi

echo
echo "========================================"
echo " PHASE 1 ROOMS RESULT"
echo "========================================"
echo "PASS=$PASS"
echo "FAIL=$FAIL"

if [ "$FAIL" -eq 0 ]; then
    echo
    echo "PHASE 1 FUNCTIONAL TEST PASSED"
    echo "ROOMS READY FOR SOCKET TWO-USER TEST"
else
    echo
    echo "PHASE 1 FUNCTIONAL TEST FAILED"
    echo "DO NOT MOVE TO ACTIVITY"
fi

echo
echo "NO DEPLOY"
echo "NO GITHUB"
echo "NO RAILWAY"
echo "========================================"
