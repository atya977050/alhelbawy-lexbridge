const roomEngine = require('../services/room-engine-service');
const roomSeats = require('../services/room-seat-service');

function emitSeats(io, roomId) {
    io.to(`room:${roomId}`).emit('room:seats', {
        ok: true,
        roomId,
        seats: roomSeats.getSeats(roomId)
    });
}

function registerSeatSocket(io, socket) {

    socket.on('seat:request', (payload, callback) => {
        try {
            const roomId = payload?.roomId;
            const seatNumber = payload?.seatNumber;

            if (!roomId) throw new Error('ROOM_ID_REQUIRED');

            roomEngine.getEngineState(roomId);

            const seat = roomSeats.requestSeat(
                roomId,
                socket.userId,
                seatNumber
            );

            emitSeats(io, roomId);

            callback?.({ ok: true, data: seat });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'SEAT_REQUEST_ERROR'
            });
        }
    });

    socket.on('seat:accept', (payload, callback) => {
        try {
            const roomId = payload?.roomId;
            const seatNumber = payload?.seatNumber;

            if (!roomId) throw new Error('ROOM_ID_REQUIRED');

            const state = roomEngine.getEngineState(roomId);

            if (state.engine.hostUserId !== socket.userId) {
                throw new Error('HOST_ONLY');
            }

            const seat = roomSeats.acceptSeat(
                roomId,
                seatNumber
            );

            emitSeats(io, roomId);

            callback?.({ ok: true, data: seat });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'SEAT_ACCEPT_ERROR'
            });
        }
    });

    socket.on('seat:reject', (payload, callback) => {
        try {
            const roomId = payload?.roomId;
            const seatNumber = payload?.seatNumber;

            if (!roomId) throw new Error('ROOM_ID_REQUIRED');

            const state = roomEngine.getEngineState(roomId);

            if (state.engine.hostUserId !== socket.userId) {
                throw new Error('HOST_ONLY');
            }

            const seat = roomSeats.rejectSeat(
                roomId,
                seatNumber
            );

            emitSeats(io, roomId);

            callback?.({ ok: true, data: seat });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'SEAT_REJECT_ERROR'
            });
        }
    });

    socket.on('seat:leave', (payload, callback) => {
        try {
            const roomId = payload?.roomId;

            if (!roomId) throw new Error('ROOM_ID_REQUIRED');

            const result = roomSeats.leaveSeat(
                roomId,
                socket.userId
            );

            emitSeats(io, roomId);

            callback?.({ ok: true, data: result });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'SEAT_LEAVE_ERROR'
            });
        }
    });

    socket.on('seat:media', (payload, callback) => {
        try {
            const roomId = payload?.roomId;
            const seatNumber = payload?.seatNumber;

            if (!roomId) throw new Error('ROOM_ID_REQUIRED');

            const seat = roomSeats.setMedia(
                roomId,
                socket.userId,
                seatNumber,
                {
                    micEnabled: payload?.micEnabled,
                    cameraEnabled: payload?.cameraEnabled
                }
            );

            emitSeats(io, roomId);

            callback?.({ ok: true, data: seat });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'SEAT_MEDIA_ERROR'
            });
        }
    });

    socket.on('seat:list', (payload, callback) => {
        try {
            const roomId = payload?.roomId;

            if (!roomId) throw new Error('ROOM_ID_REQUIRED');

            callback?.({
                ok: true,
                data: {
                    seats: roomSeats.getSeats(roomId)
                }
            });
        } catch (error) {
            callback?.({
                ok: false,
                error: error.message || 'SEAT_LIST_ERROR'
            });
        }
    });
}

module.exports = {
    registerSeatSocket,
    emitSeats
};
