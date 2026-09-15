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

function getRoomAds(roomId) {
    if (!roomId) {
        throw new Error('ROOM_ID_REQUIRED');
    }

    return runRead(`
        SELECT
            ad_id,
            room_id,
            title,
            content,
            active,
            created_at,
            updated_at
        FROM room_ads
        WHERE room_id = '${escapeSql(roomId)}'
          AND active = 1
        ORDER BY created_at DESC
        LIMIT 20;
    `);
}

function addRoomAd(roomId, title, content) {
    if (!roomId) {
        throw new Error('ROOM_ID_REQUIRED');
    }

    const safeTitle = String(title ?? '').trim();
    const safeContent = String(content ?? '').trim();

    if (!safeTitle) {
        throw new Error('AD_TITLE_REQUIRED');
    }

    if (!safeContent) {
        throw new Error('AD_CONTENT_REQUIRED');
    }

    if (safeTitle.length > 120) {
        throw new Error('AD_TITLE_TOO_LONG');
    }

    if (safeContent.length > 1000) {
        throw new Error('AD_CONTENT_TOO_LONG');
    }

    const adId = crypto.randomUUID();

    runWrite(`
        INSERT INTO room_ads (
            ad_id,
            room_id,
            title,
            content
        )
        VALUES (
            '${escapeSql(adId)}',
              '${escapeSql(roomId)}',
            '${escapeSql(safeTitle)}',
            '${escapeSql(safeContent)}'
        );
    `);

    return getRoomAds(roomId).find(
        ad => ad.ad_id === adId
    ) || null;
}

module.exports = {
    getRoomAds,
    addRoomAd
};
