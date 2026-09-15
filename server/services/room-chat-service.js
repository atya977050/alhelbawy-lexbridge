const { execFileSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const DB_PATH =
    process.env.LEXBRIDGE_DB_PATH ||
    path.join(__dirname, '..', '..', 'data', 'lexbridge.sqlite');

function runRead(sql) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, sql],
        { encoding: 'utf8' }
    ).trim();

    return output ? JSON.parse(output) : [];
}

function runWrite(sql) {
    execFileSync(
        'sqlite3',
        [DB_PATH, sql],
        { encoding: 'utf8' }
    );
}

function escapeSql(value) {
    return String(value ?? '').replace(/'/g, "''");
}

function validateMessage(message) {
    const value = String(message ?? '').trim();

    if (!value) {
        throw new Error('MESSAGE_REQUIRED');
    }

    if (value.length > 1000) {
        throw new Error('MESSAGE_TOO_LONG');
    }

    return value;
}

function getMessages(roomId, limit = 50) {
    if (!roomId) {
        throw new Error('ROOM_ID_REQUIRED');
    }

    const safeLimit = Math.min(
        Math.max(Number(limit) || 50, 1),
        100
    );

    return runRead(`
        SELECT
            m.message_id,
            m.room_id,
            m.user_id,
            u.display_name,
            u.username,
            u.avatar,
            m.message,
            m.created_at
        FROM room_messages m
        JOIN users u
          ON u.user_id = m.user_id
        WHERE m.room_id = '${escapeSql(roomId)}'
        ORDER BY m.created_at DESC
        LIMIT ${safeLimit};
    `).reverse();
}

function addMessage(roomId, userId, message) {
    if (!roomId) {
        throw new Error('ROOM_ID_REQUIRED');
    }

    if (!userId) {
        throw new Error('USER_ID_REQUIRED');
    }

    const value = validateMessage(message);
    const messageId = crypto.randomUUID();

    runWrite(`
        INSERT INTO room_messages (
            message_id,
            room_id,
            user_id,
            message
        )
        VALUES (
            '${escapeSql(messageId)}',
            '${escapeSql(roomId)}',
            '${escapeSql(userId)}',
            '${escapeSql(value)}'
        );
    `);

    const rows = runRead(`
        SELECT
            m.message_id,
            m.room_id,
            m.user_id,
            u.display_name,
            u.username,
            u.avatar,
            m.message,
            m.created_at
        FROM room_messages m
        JOIN users u
          ON u.user_id = m.user_id
        WHERE m.message_id = '${escapeSql(messageId)}'
        LIMIT 1;
    `);

    return rows[0] || null;
}

module.exports = {
    getMessages,
    addMessage
};
