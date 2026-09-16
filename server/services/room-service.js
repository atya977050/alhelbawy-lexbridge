const roomSeatService = require('./room-seat-service');
const ensureSeats = roomSeatService.ensureSeats || roomSeatService;
const crypto = require('crypto');
const {
    execFileSync
} = require('child_process');

const {
    DB_PATH
} = require('../database/db');

const {
    getViewerCount,
    clearRoom
} = require('./room-presence-service');

function sql(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }

    return `'${String(value).replace(/'/g, "''")}'`;
}

function db(sqlText) {
    return execFileSync(
        'sqlite3',
        [DB_PATH, sqlText],
        {
            encoding: 'utf8'
        }
    ).trim();
}

function query(sqlText) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, sqlText],
        {
            encoding: 'utf8'
        }
    ).trim();

    return output ? JSON.parse(output) : [];
}

function validateName(value) {
    const name = String(value ?? '').trim();

    if (!name) {
        throw new Error('اسم الغرفة مطلوب');
    }

    if (name.length < 2) {
        throw new Error('اسم الغرفة قصير جداً');
    }

    if (name.length > 120) {
        throw new Error('اسم الغرفة طويل جداً');
    }

    return name;
}

function validateDescription(value) {
    const text = String(value ?? '').trim();

    if (text.length > 1000) {
        throw new Error('وصف الغرفة طويل جداً');
    }

    return text || null;
}

function validateRules(value) {
    const text = String(value ?? '').trim();

    if (text.length > 2000) {
        throw new Error('قواعد الغرفة طويلة جداً');
    }

    return text || null;
}

function validateWelcomeMessage(value) {
    const text = String(value ?? '').trim();

    if (text.length > 500) {
        throw new Error('رسالة الترحيب طويلة جداً');
    }

    return text || null;
}

function validateCoverImage(value) {
    if (
        value !== null &&
        value !== undefined &&
        String(value).length > 1000
    ) {
        throw new Error('رابط صورة الغرفة طويل جداً');
    }

    return value
        ? String(value).trim()
        : null;
}

function validateMaxViewers(value) {
    const number = Number(value);

    if (!Number.isInteger(number)) {
        throw new Error('عدد المشاهدين يجب أن يكون رقماً صحيحاً');
    }

    if (number < 1 || number > 10000) {
        throw new Error(
            'عدد المشاهدين يجب أن يكون بين 1 و10000'
        );
    }

    return number;
}

function normalizeLocked(value) {
    if (
        value === true ||
        value === 1 ||
        value === '1' ||
        value === 'true'
    ) {
        return 1;
    }

    return 0;
}

function getRoomById(roomId) {
    if (!roomId) {
        return null;
    }

    const rows = query(`
        SELECT
            room_id,
            owner_user_id,
            name,
            description,
            status,
            rules,
            welcome_message,
            cover_image,
            max_viewers,
            is_locked,
            created_at,
            updated_at
        FROM rooms
        WHERE room_id = ${sql(roomId)}
        LIMIT 1;
    `);

    if (rows.length === 0) {
        return null;
    }

    const room = rows[0];

    return {
        room_id: room.room_id,
        owner_user_id: room.owner_user_id,
        name: room.name,
        description: room.description,
        status: room.status,
        rules: room.rules,
        welcome_message: room.welcome_message,
        cover_image: room.cover_image,
        max_viewers: room.max_viewers,
        is_locked: Boolean(room.is_locked),
        viewer_count: getViewerCount(room.room_id),
        created_at: room.created_at,
        updated_at: room.updated_at
    };
}

function getMyRoom(userId) {
    const rows = query(`
        SELECT room_id
        FROM rooms
        WHERE owner_user_id = ${sql(userId)}
        LIMIT 1;
    `);

    if (rows.length === 0) {
        return null;
    }

    return getRoomById(rows[0].room_id);
}

function assertOwner(roomId, userId) {
    const rows = query(`
        SELECT
            room_id,
            owner_user_id
        FROM rooms
        WHERE room_id = ${sql(roomId)}
        LIMIT 1;
    `);

    if (rows.length === 0) {
        const error = new Error('الغرفة غير موجودة');
        error.code = 'ROOM_NOT_FOUND';
        throw error;
    }

    if (rows[0].owner_user_id !== userId) {
        const error = new Error(
            'ليس لديك صلاحية إدارة هذه الغرفة'
        );

        error.code = 'ROOM_OWNER_REQUIRED';

        throw error;
    }

    return true;
}

function updateRoom(
    roomId,
    userId,
    data
) {
    assertOwner(roomId, userId);

    const current = getRoomById(roomId);

    if (!current) {
        const error = new Error('الغرفة غير موجودة');
        error.code = 'ROOM_NOT_FOUND';
        throw error;
    }

    const name =
        data.name === undefined
            ? current.name
            : validateName(data.name);

    const description =
        data.description === undefined
            ? current.description
            : validateDescription(data.description);

    const rules =
        data.rules === undefined
            ? current.rules
            : validateRules(data.rules);

    const welcomeMessage =
        data.welcomeMessage === undefined
            ? current.welcome_message
            : validateWelcomeMessage(
                data.welcomeMessage
            );

    const coverImage =
        data.coverImage === undefined
            ? current.cover_image
            : validateCoverImage(
                data.coverImage
            );

    const maxViewers =
        data.maxViewers === undefined
            ? current.max_viewers
            : validateMaxViewers(
                data.maxViewers
            );

    const isLocked =
        data.isLocked === undefined
            ? (current.is_locked ? 1 : 0)
            : normalizeLocked(data.isLocked);

    db(`
        UPDATE rooms
        SET
            name = ${sql(name)},
            description = ${sql(description)},
            rules = ${sql(rules)},
            welcome_message = ${sql(welcomeMessage)},
            cover_image = ${sql(coverImage)},
            max_viewers = ${maxViewers},
            is_locked = ${isLocked},
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND owner_user_id = ${sql(userId)};
    `);

    return getRoomById(roomId);
}

function startRoom(roomId, userId) {
    assertOwner(roomId, userId);

    db(`
        UPDATE rooms
        SET
            status = 'LIVE',
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND owner_user_id = ${sql(userId)};
    `);

    return getRoomById(roomId);
}

function stopRoom(roomId, userId) {
    assertOwner(roomId, userId);

    db(`
        UPDATE rooms
        SET
            status = 'INACTIVE',
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = ${sql(roomId)}
          AND owner_user_id = ${sql(userId)};
    `);

    clearRoom(roomId);

    return getRoomById(roomId);
}

function createRoomForUser(
    userId,
    displayName
) {
    const existing = getMyRoom(userId);

    if (existing) {
        return existing;
    }

    const roomId = crypto.randomUUID();

    db(`
        INSERT INTO rooms (
            room_id,
            owner_user_id,
            name,
            description,
            status,
            rules,
            welcome_message,
            cover_image,
            max_viewers,
            is_locked
        )
        VALUES (
            ${sql(roomId)},
            ${sql(userId)},
            ${sql(`غرفة ${displayName}`)},
            NULL,
            'INACTIVE',
            NULL,
            ${sql(`مرحباً بكم في غرفة ${displayName}`)},
            NULL,
            100,
            0
        );
    `);

    return getRoomById(roomId);
}

module.exports = {
    getRoomById,
    getMyRoom,
    assertOwner,
    updateRoom,
    startRoom,
    stopRoom,
    createRoomForUser,
    validateName,
    validateDescription,
    validateRules,
    validateWelcomeMessage,
    validateCoverImage,
    validateMaxViewers
};
