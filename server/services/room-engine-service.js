const {
    getRoomById,
    getMyRoom,
    startRoom,
    stopRoom
} = require('./room-service');

const {
    enterRoom,
    leaveRoom,
    getViewerCount
} = require('./room-presence-service');

const {
    clearRoom: clearRoomSeats
} = require('./room-seat-service');

const roomStates = new Map();

function error(code, status = 400) {
    const e = new Error(code);
    e.status = status;
    return e;
}

function getState(roomId) {
    return roomStates.get(roomId) || {
        roomId,
        hostUserId: null,
        active: false,
        startedAt: null
    };
}

function setState(roomId, state) {
    roomStates.set(roomId, state);
    return state;
}

function getEngineState(roomId) {
    const room = getRoomById(roomId);

    if (!room) {
        throw error('ROOM_NOT_FOUND', 404);
    }

    const state = getState(roomId);

    return {
        room,
        engine: {
            roomId,
            hostUserId: state.hostUserId,
            active: state.active,
            startedAt: state.startedAt,
            viewerCount: getViewerCount(roomId)
        }
    };
}

function start(userId) {
    const room = getMyRoom(userId);

    if (!room) {
        throw error('ROOM_NOT_FOUND', 404);
    }

    if (room.status === 'LIVE') {
        return getEngineState(room.room_id);
    }

    const updatedRoom = startRoom(room.room_id, userId);

    setState(room.room_id, {
        roomId: room.room_id,
        hostUserId: userId,
        active: true,
        startedAt: new Date().toISOString()
    });

    return getEngineState(updatedRoom.room_id);
}

function stop(userId) {
    const room = getMyRoom(userId);

    if (!room) {
        throw error('ROOM_NOT_FOUND', 404);
    }

    const updatedRoom = stopRoom(room.room_id, userId);

    roomStates.delete(room.room_id);
    clearRoomSeats(room.room_id);

    return {
        room: updatedRoom,
        engine: {
            roomId: room.room_id,
            hostUserId: null,
            active: false,
            startedAt: null,
            viewerCount: 0
        }
    };
}

function join(roomId, userId) {
    const room = getRoomById(roomId);

    if (!room) {
        throw error('ROOM_NOT_FOUND', 404);
    }

    if (room.status !== 'LIVE') {
        throw error('ROOM_NOT_LIVE', 409);
    }

    const state = getState(roomId);

    if (state.hostUserId === userId) {
        return getEngineState(roomId);
    }

    if (room.is_locked) {
        throw error('ROOM_LOCKED', 403);
    }

    enterRoom(roomId, userId);

    const count = getViewerCount(roomId);

    if (count > room.max_viewers) {
        leaveRoom(roomId, userId);
        throw error('ROOM_FULL', 409);
    }

    return getEngineState(roomId);
}

function leave(roomId, userId) {
    const room = getRoomById(roomId);

    if (!room) {
        throw error('ROOM_NOT_FOUND', 404);
    }

    const state = getState(roomId);

    if (state.hostUserId === userId) {
        throw error('HOST_MUST_STOP_ROOM', 409);
    }

    leaveRoom(roomId, userId);

    return getEngineState(roomId);
}

function getRoomRole(roomId, userId) {
    const room = getRoomById(roomId);

    if (!room) {
        throw error('ROOM_NOT_FOUND', 404);
    }

    const state = getState(roomId);

    let role = 'viewer';

    if (state.hostUserId === userId) {
        role = 'host';
    }

    return {
        roomId,
        userId,
        role,
        active: state.active,
        viewerCount: getViewerCount(roomId)
    };
}

module.exports = {
    getEngineState,
    start,
    stop,
    join,
    leave,
    getRoomRole
};
