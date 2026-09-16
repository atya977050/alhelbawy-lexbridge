const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { DB_PATH } = require('../database/db');

const MAX_SEATS = 12;

function sql(value) {
    if (value === null || value === undefined) return 'NULL';
    return `'${String(value).replace(/'/g, "''")}'`;
}

// Using unified db.js module methods
const dbModule = require('../database/db');

function db(statement) {
    if (typeof dbModule.runWrite === 'function') {
        return dbModule.runWrite(statement);
    }
    if (typeof dbModule.db === 'function') {
        return dbModule.db(statement);
    }
    return dbModule.exec ? dbModule.exec(statement) : statement;
}

function query(statement) {
    if (typeof dbModule.runRead === 'function') {
        return dbModule.runRead(statement);
    }
    if (typeof dbModule.query === 'function') {
        return dbModule.query(statement);
    }
    return [];
}

function error(code, status = 400) {
    const e = new Error(code);
    e.status = status;
    return e;
}

function validateSeatNumber(seatNumber) {
    const number = Number(seatNumber);

    if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > MAX_SEATS
    ) {
        throw error('INVALID_SEAT_NUMBER', 400);
    }

    return number;
}

function ensureSeats(roomId) {
    for (let i = 1; i <= MAX_SEATS; i += 1) {
        db(`
            INSERT OR IGNORE INTO room_seats (
                seat_id,
                room_id,
                seat_number
            )
            VALUES (
                ${sql(crypto.randomUUID())},
                ${sql(roomId)},
                ${i}
            );
        `);
    }
}

function getSeats(roomId) {
    ensureSeats(roomId);

    return query(`
        SELECT
            seat_id,
            room_id,
            seat_number,
            user_id,
            status,
            mic_enabled,
            camera_enabled,
            joined_at,
            updated_at
        FROM room_seats
        WHERE room_id = ${sql(roomId)}
        ORDER BY seat_number ASC;
    `);
}

function getSeat(roomId, seatNumber) {
    const number = validateSeatNumber(seatNumber);
    ensureSeats(roomId);

    const rows = query(`
        SELECT
            seat_id,
            room_id,
            seat_number,
            user_id,
            status,
            mic_enabled,
            camera_enabled,
            joined_at,
            updated_at
        FROM room_seats
        WHERE room_id = ${sql(roomId)}
          AND seat_number = ${number}
        LIMIT 1;
    `);

    if (!rows.length) {
        throw error('SEAT_NOT_FOUND', 404);
    }

    return rows[0];
}

function requestSeat(roomId, userId, seatNumber) {
    const seat = getSeat(roomId, seatNumber);

    if (seat.status !== 'EMPTY') {
        throw error('SEAT_NOT_AVAILABLE', 409);
    }

    db(`
        UPDATE room_seats
        SET
            status = 'REQUESTED',
            user_id = ${sql(userId)},
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND seat_number = ${seat.seat_number};
    `);

    return getSeat(roomId, seat.seat_number);
}

function acceptSeat(roomId, seatNumber) {
    const seat = getSeat(roomId, seatNumber);

    if (seat.status !== 'REQUESTED') {
        throw error('SEAT_REQUEST_NOT_FOUND', 409);
    }

    db(`
        UPDATE room_seats
        SET
            status = 'OCCUPIED',
            mic_enabled = 0,
            camera_enabled = 0,
            joined_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND seat_number = ${seat.seat_number};
    `);

    return getSeat(roomId, seat.seat_number);
}

function rejectSeat(roomId, seatNumber) {
    const seat = getSeat(roomId, seatNumber);

    if (seat.status !== 'REQUESTED') {
        throw error('SEAT_REQUEST_NOT_FOUND', 409);
    }

    db(`
        UPDATE room_seats
        SET
            user_id = NULL,
            status = 'EMPTY',
            mic_enabled = 0,
            camera_enabled = 0,
            joined_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND seat_number = ${seat.seat_number};
    `);

    return getSeat(roomId, seat.seat_number);
}

function leaveSeat(roomId, userId) {
    const rows = query(`
        SELECT seat_number
        FROM room_seats
        WHERE room_id = ${sql(roomId)}
          AND user_id = ${sql(userId)}
          AND status IN ('REQUESTED', 'OCCUPIED')
        LIMIT 1;
    `);

    if (!rows.length) {
        throw error('USER_NOT_ON_SEAT', 404);
    }

    db(`
        UPDATE room_seats
        SET
            user_id = NULL,
            status = 'EMPTY',
            mic_enabled = 0,
            camera_enabled = 0,
            joined_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND user_id = ${sql(userId)};
    `);

    return getSeats(roomId);
}

function setMedia(roomId, userId, seatNumber, data) {
    const seat = getSeat(roomId, seatNumber);

    if (
        seat.status !== 'OCCUPIED' ||
        seat.user_id !== userId
    ) {
        throw error('SEAT_PERMISSION_DENIED', 403);
    }

    const micEnabled =
        data.micEnabled === undefined
            ? Boolean(seat.mic_enabled)
            : Boolean(data.micEnabled);

    const cameraEnabled =
        data.cameraEnabled === undefined
            ? Boolean(seat.camera_enabled)
            : Boolean(data.cameraEnabled);

    db(`
        UPDATE room_seats
        SET
            mic_enabled = ${micEnabled ? 1 : 0},
            camera_enabled = ${cameraEnabled ? 1 : 0},
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND seat_number = ${seat.seat_number};
    `);

    return getSeat(roomId, seat.seat_number);
}

function clearRoom(roomId) {
    db(`
        UPDATE room_seats
        SET
            user_id = NULL,
            status = 'EMPTY',
            mic_enabled = 0,
            camera_enabled = 0,
            joined_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)};
    `);
}

module.exports = {
    ensureSeats,
    MAX_SEATS,
    getSeats,
    getSeat,
    requestSeat,
    acceptSeat,
    rejectSeat,
    leaveSeat,
    setMedia,
    clearRoom
};
