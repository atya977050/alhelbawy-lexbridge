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

function getMe(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم مطلوب');
    }

    const users = query(`
        SELECT
            user_id,
            username,
            display_name,
            avatar,
            bio,
            status,
            created_at,
            updated_at
        FROM users
        WHERE user_id = ${sql(userId)}
        LIMIT 1;
    `);

    if (users.length === 0) {
        const error = new Error(
            'المستخدم غير موجود'
        );

        error.code = 'USER_NOT_FOUND';

        throw error;
    }

    const user = users[0];

    const rooms = query(`
        SELECT
            room_id,
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
        WHERE owner_user_id = ${sql(userId)}
        LIMIT 1;
    `);

    const wallets = query(`
        SELECT
            wallet_id,
            currency,
            available_minor,
            reserved_minor,
            version
        FROM wallets
        WHERE user_id = ${sql(userId)}
        LIMIT 1;
    `);

    const friends = query(`
        SELECT COUNT(*) AS count
        FROM friendships
        WHERE (
            user_id = ${sql(userId)}
            OR friend_user_id = ${sql(userId)}
        )
        AND status = 'accepted';
    `);

    const following = query(`
        SELECT COUNT(*) AS count
        FROM follows
        WHERE follower_user_id = ${sql(userId)};
    `);

    const followers = query(`
        SELECT COUNT(*) AS count
        FROM follows
        WHERE followed_user_id = ${sql(userId)};
    `);

    const visitors = query(`
        SELECT COUNT(DISTINCT visitor_user_id) AS count
        FROM visits
        WHERE visited_user_id = ${sql(userId)}
          AND visitor_user_id != ${sql(userId)};
    `);

    const totalVisits = query(`
        SELECT COUNT(*) AS count
        FROM visits
        WHERE visited_user_id = ${sql(userId)}
          AND visitor_user_id != ${sql(userId)};
    `);

    const room = rooms.length > 0
        ? rooms[0]
        : null;

    const wallet = wallets.length > 0
        ? wallets[0]
        : null;

    return {
        user: {
            user_id: user.user_id,
            username: user.username,
            display_name: user.display_name,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status,
            created_at: user.created_at,
            updated_at: user.updated_at
        },

        stats: {
            friends: Number(friends[0]?.count || 0),
            following: Number(following[0]?.count || 0),
            followers: Number(followers[0]?.count || 0),
            visitors: Number(visitors[0]?.count || 0),
            total_visits: Number(totalVisits[0]?.count || 0)
        },

        room: room
            ? {
                room_id: room.room_id,
                name: room.name,
                description: room.description,
                status: room.status,
                rules: room.rules,
                welcome_message: room.welcome_message,
                cover_image: room.cover_image,
                max_viewers: room.max_viewers,
                is_locked: Boolean(room.is_locked),
                created_at: room.created_at,
                updated_at: room.updated_at
            }
            : null,

        wallet: wallet
            ? {
                wallet_id: wallet.wallet_id,
                currency: wallet.currency,
                available_minor: wallet.available_minor,
                reserved_minor: wallet.reserved_minor,
                version: wallet.version
            }
            : null
    };
}

module.exports = {
    getMe
};
