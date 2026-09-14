const crypto = require('crypto');
const {
    execFileSync
} = require('child_process');

const {
    DB_PATH
} = require('../database/db');

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

function validateDisplayName(displayName) {
    const value =
        String(displayName ?? '').trim();

    if (!value) {
        throw new Error('اسم العرض مطلوب');
    }

    if (value.length > 100) {
        throw new Error(
            'اسم العرض طويل جداً'
        );
    }

    return value;
}

function validateBio(bio) {
    const value =
        String(bio ?? '').trim();

    if (value.length > 500) {
        throw new Error(
            'النبذة طويلة جداً'
        );
    }

    return value;
}

function validateAvatar(avatar) {
    if (
        avatar === null ||
        avatar === undefined ||
        avatar === ''
    ) {
        return null;
    }

    const value =
        String(avatar).trim();

    if (value.length > 1000) {
        throw new Error(
            'رابط الصورة طويل جداً'
        );
    }

    return value;
}

function getProfile(userId) {
    if (!userId) {
        return null;
    }

    const rows =
        query(`
            SELECT
                u.user_id,
                u.username,
                u.display_name,
                u.avatar,
                u.bio,
                u.status,
                u.created_at,
                u.updated_at,

                r.room_id,
                r.name AS room_name,
                r.status AS room_status,

                (
                    SELECT COUNT(*)
                    FROM friendships f
                    WHERE (
                        f.user_id = u.user_id
                        OR f.friend_user_id = u.user_id
                    )
                    AND f.status = 'accepted'
                ) AS friends_count,

                (
                    SELECT COUNT(*)
                    FROM follows f
                    WHERE f.followed_user_id = u.user_id
                ) AS followers_count,

                (
                    SELECT COUNT(*)
                    FROM follows f
                    WHERE f.follower_user_id = u.user_id
                ) AS following_count,

                (
                    SELECT COUNT(DISTINCT v.visitor_user_id)
                    FROM visits v
                    WHERE v.visited_user_id = u.user_id
                ) AS visitors_count

            FROM users u

            LEFT JOIN rooms r
                ON r.owner_user_id = u.user_id

            WHERE u.user_id = ${sql(userId)}
            LIMIT 1;
        `);

    if (rows.length === 0) {
        return null;
    }

    const row = rows[0];

    return {
        user: {
            user_id: row.user_id,
            username: row.username,
            display_name: row.display_name,
            avatar: row.avatar,
            bio: row.bio || '',
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at
        },

        room: {
            room_id: row.room_id,
            name: row.room_name,
            status: row.room_status
        },

        stats: {
            friends: Number(row.friends_count || 0),
            followers: Number(row.followers_count || 0),
            following: Number(row.following_count || 0),
            visitors: Number(row.visitors_count || 0)
        }
    };
}

function updateProfile(
    userId,
    {
        displayName,
        avatar,
        bio
    } = {}
) {
    if (!userId) {
        throw new Error('معرف المستخدم مطلوب');
    }

    const existing =
        query(`
            SELECT user_id
            FROM users
            WHERE user_id = ${sql(userId)}
            LIMIT 1;
        `);

    if (existing.length === 0) {
        const error =
            new Error('الحساب غير موجود');

        error.code =
            'ACCOUNT_NOT_FOUND';

        throw error;
    }

    const current =
        query(`
            SELECT
                display_name,
                avatar,
                bio
            FROM users
            WHERE user_id = ${sql(userId)}
            LIMIT 1;
        `)[0];

    const nextDisplayName =
        displayName === undefined
            ? current.display_name
            : validateDisplayName(displayName);

    const nextAvatar =
        avatar === undefined
            ? current.avatar
            : validateAvatar(avatar);

    const nextBio =
        bio === undefined
            ? (current.bio || '')
            : validateBio(bio);

    const transaction = `
BEGIN;

UPDATE users
SET
    display_name = ${sql(nextDisplayName)},
    avatar = ${sql(nextAvatar)},
    bio = ${sql(nextBio)},
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = ${sql(userId)};

UPDATE rooms
SET
    name = ${sql(`غرفة ${nextDisplayName}`)},
    updated_at = CURRENT_TIMESTAMP
WHERE owner_user_id = ${sql(userId)};

COMMIT;
`;

    try {
        db(transaction);
    } catch (error) {
        try {
            db('ROLLBACK;');
        } catch (_) {
            // نحافظ على الخطأ الأصلي
        }

        throw error;
    }

    return getProfile(userId);
}

function recordVisit(
    visitorUserId,
    visitedUserId
) {
    if (!visitorUserId || !visitedUserId) {
        throw new Error('بيانات الزيارة غير مكتملة');
    }

    if (visitorUserId === visitedUserId) {
        return false;
    }

    const visitId =
        crypto.randomUUID();

    db(`
        INSERT INTO visits (
            visit_id,
            visitor_user_id,
            visited_user_id
        )
        VALUES (
            ${sql(visitId)},
            ${sql(visitorUserId)},
            ${sql(visitedUserId)}
        );
    `);

    return true;
}

module.exports = {
    getProfile,
    updateProfile,
    recordVisit,
    validateDisplayName,
    validateBio,
    validateAvatar
};
