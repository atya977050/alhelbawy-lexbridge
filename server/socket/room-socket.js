const { getSessionByToken } = require('../services/session-service');
const roomEngine = require('../services/room-engine-service');
const roomPresence = require('../services/room-presence-service');
const roomSeat = require('../services/room-seat-service');
const roomChat = require('../services/room-chat-service');
const {
    registerSeatSocket,
    emitSeats
} = require('./seat-socket');

const { registerWebRTCSignaling } = require('./webrtc-socket');

function requireRoomMember(socket, roomId) {
    if (!socket.roomIds || !socket.roomIds.has(roomId)) {
        throw new Error('ROOM_MEMBERSHIP_REQUIRED');
    }
}

function extractToken(socket) {
    const authToken = socket.handshake.auth?.token;
    if (authToken) return authToken;

    const header = socket.handshake.headers?.authorization || '';
    if (header.startsWith('Bearer ')) {
        return header.slice(7).trim();
    }

    return null;
}

function registerRoomSocket(io) {
    io.use((socket, next) => {
        try {
            const token = extractToken(socket);

            if (!token) {
                return next(new Error('AUTH_REQUIRED'));
            }

            const session = getSessionByToken(token);

            if (!session) {
                return next(new Error('INVALID_SESSION'));
            }

            socket.authSession = session;
            socket.userId = session.user_id;

            next();
        } catch (error) {
            next(new Error('SOCKET_AUTH_ERROR'));
        }
    });

    io.on('connection', (socket) => {
        socket.roomIds = new Set();

        registerSeatSocket(io, socket);
        registerWebRTCSignaling(io, socket);
        socket.on('room:join', (payload, callback) => {
            try {
                const roomId = payload?.roomId;

                if (!roomId) {
                    throw new Error('ROOM_ID_REQUIRED');
                }

                const result = roomEngine.join(roomId, socket.userId);

                socket.join(`room:${roomId}`);
                socket.roomIds.add(roomId);

                roomPresence.enterRoom(roomId, socket.userId);

                io.to(`room:${roomId}`).emit('room:state', result);
                emitSeats(io, roomId);

                if (typeof callback === 'function') {
                    callback({
                        ok: true,
                        data: result
                    });
                }
            } catch (error) {
                if (typeof callback === 'function') {
                    callback({
                        ok: false,
                        error: error.message || 'ROOM_JOIN_ERROR'
                    });
                }
            }
        });

        socket.on('room:leave', (payload, callback) => {
            try {
                const roomId = payload?.roomId;

                if (!roomId) {
                    throw new Error('ROOM_ID_REQUIRED');
                }

                const result = roomEngine.leave(roomId, socket.userId);

                socket.leave(`room:${roomId}`);

                roomPresence.leaveRoom(roomId, socket.userId);
                roomSeat.leaveSeat(roomId, socket.userId);
                socket.roomIds.delete(roomId);

                io.to(`room:${roomId}`).emit('room:state', result);
                emitSeats(io, roomId);

                if (typeof callback === 'function') {
                    callback({
                        ok: true,
                        data: result
                    });
                }
            } catch (error) {
                if (typeof callback === 'function') {
                    callback({
                        ok: false,
                        error: error.message || 'ROOM_LEAVE_ERROR'
                    });
                }
            }
        });

        socket.on('room:chat:list', (payload, callback) => {
            try {
                const roomId = payload?.roomId;

                if (!roomId) {
                    throw new Error('ROOM_ID_REQUIRED');
                }

                requireRoomMember(socket, roomId);

                const messages = roomChat.getMessages(
                    roomId,
                    payload?.limit
                );

                if (typeof callback === 'function') {
                    callback({
                        ok: true,
                        data: {
                            messages
                        }
                    });
                }
            } catch (error) {
                if (typeof callback === 'function') {
                    callback({
                        ok: false,
                        error: error.message || 'ROOM_CHAT_LIST_ERROR'
                    });
                }
            }
        });

        socket.on('room:chat:send', (payload, callback) => {
            try {
                const roomId = payload?.roomId;

                if (!roomId) {
                    throw new Error('ROOM_ID_REQUIRED');
                }

                requireRoomMember(socket, roomId);

                const message = roomChat.addMessage(
                    roomId,
                    socket.userId,
                    payload?.message
                );

                io.to(`room:${roomId}`).emit(
                    'room:chat:message',
                    message
                );

                if (typeof callback === 'function') {
                    callback({
                        ok: true,
                        data: {
                            message
                        }
                    });
                }
            } catch (error) {
                if (typeof callback === 'function') {
                    callback({
                        ok: false,
                        error: error.message || 'ROOM_CHAT_SEND_ERROR'
                    });
                }
            }
        });

        socket.on('room:state', (payload, callback) => {
            try {
                const roomId = payload?.roomId;

                if (!roomId) {
                    throw new Error('ROOM_ID_REQUIRED');
                }

                const result = roomEngine.getEngineState(roomId);

                if (typeof callback === 'function') {
                    callback({
                        ok: true,
                        data: result
                    });
                }
            } catch (error) {
                if (typeof callback === 'function') {
                    callback({
                        ok: false,
                        error: error.message || 'ROOM_STATE_ERROR'
                    });
                }
            }
        });

        socket.on('disconnect', () => {
            try {
                for (const roomId of socket.roomIds || []) {
                    roomPresence.leaveRoom(roomId, socket.userId);
                    roomSeat.leaveSeat(roomId, socket.userId);

                    io.to(`room:${roomId}`).emit('room:presence', {
                        roomId,
                        viewerCount: roomPresence.getViewerCount(roomId)
                    });

                    emitSeats(io, roomId);
                }

                socket.roomIds?.clear();
            } catch (error) {
                console.error(
                    '[ROOM SOCKET CLEANUP]',
                    error.message
                );
            }
        });
    });
}

module.exports = {
    registerRoomSocket
};
