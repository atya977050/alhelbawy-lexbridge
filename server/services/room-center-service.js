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
    getShareData
};
