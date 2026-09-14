const { getSessionByToken } = require('../services/session-service');
const roomEngine = require('../services/room-engine-service');
const {
    registerSeatSocket,
    emitSeats
} = require('./seat-socket');

const { registerWebRTCSignaling } = require('./webrtc-socket');

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

                io.to(`room:${roomId}`).emit('room:state', result);

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
            // WebRTC/seat cleanup سيضاف في المراحل التالية.
        });
    });
}

module.exports = {
    registerRoomSocket
};
