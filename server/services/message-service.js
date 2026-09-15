'use strict';

const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DB_PATH =
    process.env.LEXBRIDGE_DB_PATH ||
    path.join(__dirname, '..', '..', 'data', 'lexbridge.sqlite');

function sql(value) {
    return "'" +
        String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "''")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n') +
        "'";
}

function runRead(statement) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, statement],
        { encoding: 'utf8' }
    ).trim();

    return output ? JSON.parse(output) : [];
}

function runWrite(statement) {
    execFileSync(
        'sqlite3',
        [DB_PATH, statement],
        { encoding: 'utf8' }
    );
}

function safeLimit(value, fallback = 50) {
    const n = Number.parseInt(value, 10);

    if (!Number.isFinite(n)) {
        return fallback;
    }

    return Math.max(1, Math.min(100, n));
}

function getNotifications(userId, limit = 50) {
    if (!userId) {
        throw new Error('المستخدم مطلوب');
    }

    return runRead(`
        SELECT
            notification_id,
            user_id,
            type,
            title,
            body,
            related_user_id,
            related_room_id,
            related_activity_id,
            is_read,
            created_at
        FROM message_notifications
        WHERE user_id = ${sql(userId)}
        ORDER BY created_at DESC
        LIMIT ${safeLimit(limit)};
    `);
}

function getUnreadCount(userId) {
    if (!userId) {
        throw new Error('المستخدم مطلوب');
    }

    const rows = runRead(`
        SELECT COUNT(*) AS count
        FROM message_notifications
        WHERE user_id = ${sql(userId)}
          AND is_read = 0;
    `);

    return Number(rows[0]?.count || 0);
}

function markNotificationRead(userId, notificationId) {
    if (!userId || !notificationId) {
        throw new Error('بيانات الإشعار ناقصة');
    }

    runWrite(`
        UPDATE message_notifications
        SET is_read = 1
        WHERE notification_id = ${sql(notificationId)}
          AND user_id = ${sql(userId)};
    `);

    return true;
}

function markAllNotificationsRead(userId) {
    if (!userId) {
        throw new Error('المستخدم مطلوب');
    }

    runWrite(`
        UPDATE message_notifications
        SET is_read = 1
        WHERE user_id = ${sql(userId)}
          AND is_read = 0;
    `);

    return true;
}

function createNotification(
    userId,
    type,
    title,
    body = '',
    relatedUserId = null,
    relatedRoomId = null,
    relatedActivityId = null
) {
    if (!userId || !type || !title) {
        throw new Error('بيانات الإشعار ناقصة');
    }

    const notificationId = crypto.randomUUID();

    runWrite(`
        INSERT INTO message_notifications (
            notification_id,
            user_id,
            type,
            title,
            body,
            related_user_id,
            related_room_id,
            related_activity_id
        )
        VALUES (
            ${sql(notificationId)},
            ${sql(userId)},
            ${sql(type)},
            ${sql(title)},
            ${sql(body)},
            ${sql(relatedUserId)},
            ${sql(relatedRoomId)},
            ${sql(relatedActivityId)}
        );
    `);

    return runRead(`
        SELECT
            notification_id,
            user_id,
            type,
            title,
            body,
            related_user_id,
            related_room_id,
            related_activity_id,
            is_read,
            created_at
        FROM message_notifications
        WHERE notification_id = ${sql(notificationId)}
        LIMIT 1;
    `)[0] || null;
}

function getEvents(userId, limit = 50) {
    if (!userId) {
        throw new Error('المستخدم مطلوب');
    }

    return runRead(`
        SELECT
            event_id,
            user_id,
            event_key,
            title,
            body,
            related_user_id,
            related_room_id,
            related_activity_id,
            created_at
        FROM message_events
        WHERE user_id = ${sql(userId)}
        ORDER BY created_at DESC
        LIMIT ${safeLimit(limit)};
    `);
}

function createEvent(
    userId,
    eventKey,
    title,
    body = '',
    relatedUserId = null,
    relatedRoomId = null,
    relatedActivityId = null
) {
    if (!userId || !eventKey || !title) {
        throw new Error('بيانات الحدث ناقصة');
    }

    const eventId = crypto.randomUUID();

    runWrite(`
        INSERT INTO message_events (
            event_id,
            user_id,
            event_key,
            title,
            body,
            related_user_id,
            related_room_id,
            related_activity_id
        )
        VALUES (
            ${sql(eventId)},
            ${sql(userId)},
            ${sql(eventKey)},
            ${sql(title)},
            ${sql(body)},
            ${sql(relatedUserId)},
            ${sql(relatedRoomId)},
            ${sql(relatedActivityId)}
        );
    `);

    return runRead(`
        SELECT
            event_id,
            user_id,
            event_key,
            title,
            body,
            related_user_id,
            related_room_id,
            related_activity_id,
            created_at
        FROM message_events
        WHERE event_id = ${sql(eventId)}
        LIMIT 1;
    `)[0] || null;
}

module.exports = {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    createNotification,
    getEvents,
    createEvent
};
