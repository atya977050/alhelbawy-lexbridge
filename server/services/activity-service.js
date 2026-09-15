'use strict';

const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

const DB_PATH =
    process.env.LEXBRIDGE_DB_PATH ||
    path.join(__dirname, '..', '..', 'data', 'lexbridge.sqlite');

const PLATFORM_ITEMS = [
    {
        key: 'happy-luck',
        title: 'محطة الحظ السعيد',
        icon: '🍀',
        description: 'فعاليات الحظ والهدايا والترتيب اليومي والأسبوعي.',
        type: 'event'
    },
    {
        key: 'zodiac',
        title: 'قاعة الأبراج',
        icon: '♈',
        description: 'الأبراج اليومية وتفاصيل الحظ والتوافق.',
        type: 'event'
    },
    {
        key: 'svip-power',
        title: 'SVIP POWER',
        icon: '👑',
        description: 'مزايا ومستويات القوة الخاصة بالمستخدمين.',
        type: 'feature'
    },
    {
        key: 'frame-customization',
        title: 'تخصيص الإطار',
        icon: '🖼️',
        description: 'اختيار وتخصيص إطار الملف الشخصي.',
        type: 'feature'
    },
    {
        key: 'didi-store',
        title: 'متجر DIDI LIVE',
        icon: '🛍️',
        description: 'متجر العناصر والهدايا والخصائص الرقمية.',
        type: 'store'
    },
    {
        key: 'didi-millionaire',
        title: 'مليونير DIDI LIVE',
        icon: '💎',
        description: 'فعالية المليونير والترتيبات الخاصة بها.',
        type: 'event'
    },
    {
        key: 'app-rules',
        title: 'قوانين التطبيق',
        icon: '📜',
        description: 'قواعد الاستخدام والسلوك داخل المنصة.',
        type: 'rules'
    }
];

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

function getPlatformItems() {
    return PLATFORM_ITEMS.map(item => ({ ...item }));
}

function getRoomActivity(roomId) {
    if (!roomId) {
        return [];
    }

    return runRead(`
        SELECT
            ad_id AS activity_id,
            room_id,
            title,
            content,
            'room_ad' AS type,
            created_at
        FROM room_ads
        WHERE room_id = ${sql(roomId)}
          AND active = 1
        ORDER BY created_at DESC;
    `);
}

function createActivityEvent(userId, key, title, description) {
    if (!userId) {
        throw new Error('المستخدم مطلوب');
    }

    if (!key || !title) {
        throw new Error('بيانات النشاط ناقصة');
    }

    const activityId = crypto.randomUUID();

    runWrite(`
        INSERT INTO activity_events (
            activity_id,
            user_id,
            activity_key,
            title,
            description
        )
        VALUES (
            ${sql(activityId)},
            ${sql(userId)},
            ${sql(key)},
            ${sql(title)},
            ${sql(description || '')}
        );
    `);

    return runRead(`
        SELECT
            activity_id,
            user_id,
            activity_key,
            title,
            description,
            created_at
        FROM activity_events
        WHERE activity_id = ${sql(activityId)}
        LIMIT 1;
    `)[0] || null;
}

function getRecentEvents(userId, limit = 30) {
    const safeLimit = Math.max(
        1,
        Math.min(100, Number.parseInt(limit, 10) || 30)
    );

    return runRead(`
        SELECT
            activity_id,
            user_id,
            activity_key,
            title,
            description,
            created_at
        FROM activity_events
        WHERE user_id = ${sql(userId)}
        ORDER BY created_at DESC
        LIMIT ${safeLimit};
    `);
}

function sql(value) {
    return "'" +
        String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "''")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n') +
        "'";
}

module.exports = {
    getPlatformItems,
    getRoomActivity,
    createActivityEvent,
    getRecentEvents
};
