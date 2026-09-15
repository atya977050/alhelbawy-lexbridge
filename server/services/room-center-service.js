const {
    getMyRoom,
    updateRoom,
    startRoom,
    stopRoom
} = require('./room-service');

const {
    getViewerCount
} = require('./room-presence-service');

function getRoomCenter(userId) {
    const room = getMyRoom(userId);

    if (!room) {
        const error = new Error('ROOM_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    return {
        room,
        viewerCount: getViewerCount(room.room_id)
    };
}

function updateRoomCenter(userId, input) {
    const current = getMyRoom(userId);

    if (!current) {
        const error = new Error('ROOM_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const room = updateRoom(
        current.room_id,
        userId,
        input
    );

    return {
        room,
        viewerCount: getViewerCount(room.room_id)
    };
}

function startRoomCenter(userId) {
    const current = getMyRoom(userId);

    if (!current) {
        const error = new Error('ROOM_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const room = startRoom(
        current.room_id,
        userId
    );

    return {
        room,
        viewerCount: getViewerCount(room.room_id)
    };
}

function stopRoomCenter(userId) {
    const current = getMyRoom(userId);

    if (!current) {
        const error = new Error('ROOM_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const room = stopRoom(
        current.room_id,
        userId
    );

    return {
        room,
        viewerCount: getViewerCount(room.room_id)
    };
}


function getAvailableRooms() {
    const { execFileSync } = require('child_process');
    const path = require('path');

    const dbPath =
        process.env.LEXBRIDGE_DB_PATH ||
        path.join(__dirname, '..', '..', 'data', 'lexbridge.sqlite');

    const script = `
        SELECT
            r.room_id,
            r.owner_user_id,
            r.name,
            r.description,
            r.status,
            r.cover_image,
            r.max_viewers,
            r.is_locked,
            r.created_at,
            r.updated_at
        FROM rooms r
        WHERE r.status = 'LIVE'
        ORDER BY r.updated_at DESC, r.created_at DESC;
    `;

    const output = execFileSync(
        'sqlite3',
        ['-json', dbPath, script],
        { encoding: 'utf8' }
    ).trim();

    const rooms = output ? JSON.parse(output) : [];

    return rooms.map(room => ({
        ...room,
        viewerCount: getViewerCount(room.room_id)
    }));
}

function getShareData(req, userId) {
    const room = getMyRoom(userId);

    if (!room) {
        const error = new Error('ROOM_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const configuredBase =
        String(process.env.PUBLIC_BASE_URL || '').trim();

    const base =
        configuredBase ||
        `${req.protocol}://${req.get('host')}`;

    return {
        roomId: room.room_id,
        roomName: room.name,
        url: `${base}/room.html?room=${encodeURIComponent(room.room_id)}`
    };
}

module.exports = {
    getRoomCenter,
    updateRoomCenter,
    startRoomCenter,
    stopRoomCenter,
    getShareData,
    getAvailableRooms
};
