const rooms = new Map();

function getSet(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }

    return rooms.get(roomId);
}

function enterRoom(roomId, userId) {
    if (!roomId || !userId) {
        throw new Error('معرف الغرفة والمستخدم مطلوبان');
    }

    const set = getSet(roomId);

    set.add(userId);

    return set.size;
}

function leaveRoom(roomId, userId) {
    if (!roomId || !userId) {
        return 0;
    }

    const set = rooms.get(roomId);

    if (!set) {
        return 0;
    }

    set.delete(userId);

    if (set.size === 0) {
        rooms.delete(roomId);
        return 0;
    }

    return set.size;
}

function getViewerCount(roomId) {
    const set = rooms.get(roomId);

    return set ? set.size : 0;
}

function clearRoom(roomId) {
    rooms.delete(roomId);
}

function clearAll() {
    rooms.clear();
}

module.exports = {
    enterRoom,
    leaveRoom,
    getViewerCount,
    clearRoom,
    clearAll
};
