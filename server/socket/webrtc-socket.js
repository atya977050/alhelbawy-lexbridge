function getRoomPeers(io, socket, roomId) {
    if (!roomId) {
        throw new Error('ROOM_ID_REQUIRED');
    }

    if (!socket.rooms.has(`room:${roomId}`)) {
        throw new Error('SENDER_NOT_IN_ROOM');
    }

    const room = io.sockets.adapter.rooms.get(`room:${roomId}`);

    if (!room) {
        return [];
    }

    return [...room]
        .filter(socketId => socketId !== socket.id)
        .map(socketId => {
            const peer = io.sockets.sockets.get(socketId);

            if (!peer) {
                return null;
            }

            return {
                socketId,
                userId: peer.userId
            };
        })
        .filter(Boolean);
}

function isPeerInRoom(io, socketId, roomId) {
    const peer = io.sockets.sockets.get(socketId);

    if (!peer) {
        return null;
    }

    if (!peer.rooms.has(`room:${roomId}`)) {
        return null;
    }

    return peer;
}

function emitToPeer(io, socket, event, payload) {
    const roomId = payload?.roomId;
    const targetSocketId = payload?.targetSocketId;

    if (!roomId) {
        throw new Error('ROOM_ID_REQUIRED');
    }

    if (!targetSocketId) {
        throw new Error('TARGET_SOCKET_ID_REQUIRED');
    }

    if (targetSocketId === socket.id) {
        throw new Error('SELF_SIGNALING_NOT_ALLOWED');
    }

    if (!socket.rooms.has(`room:${roomId}`)) {
        throw new Error('SENDER_NOT_IN_ROOM');
    }

    const target = isPeerInRoom(io, targetSocketId, roomId);

    if (!target) {
        throw new Error('TARGET_PEER_NOT_IN_ROOM');
    }

    target.emit(event, {
        roomId,
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        payload: payload.payload ?? null
    });
}

function registerWebRTCSignaling(io, socket) {

    socket.on('webrtc:peers', (payload, callback) => {
        try {
            const peers = getRoomPeers(
                io,
                socket,
                payload?.roomId
            );

            callback?.({
                ok: true,
                data: {
                    peers
                }
            });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'WEBRTC_PEERS_ERROR'
            });
        }
    });

    socket.on('webrtc:offer', (payload, callback) => {
        try {
            emitToPeer(io, socket, 'webrtc:offer', payload);
            callback?.({ ok: true });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'WEBRTC_OFFER_ERROR'
            });
        }
    });

    socket.on('webrtc:answer', (payload, callback) => {
        try {
            emitToPeer(io, socket, 'webrtc:answer', payload);
            callback?.({ ok: true });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'WEBRTC_ANSWER_ERROR'
            });
        }
    });

    socket.on('webrtc:ice-candidate', (payload, callback) => {
        try {
            emitToPeer(io, socket, 'webrtc:ice-candidate', payload);
            callback?.({ ok: true });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'WEBRTC_ICE_ERROR'
            });
        }
    });
}

module.exports = {
    registerWebRTCSignaling
};
