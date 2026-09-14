const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DB_PATH = require('./../database/db').DB_PATH;

function sql(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }

    return `'${String(value).replace(/'/g, "''")}'`;
}

function run(statement) {
    return execFileSync(
        'sqlite3',
        [DB_PATH, statement],
        { encoding: 'utf8' }
    ).trim();
}

function query(statement) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, statement],
        { encoding: 'utf8' }
    ).trim();

    return output ? JSON.parse(output) : [];
}

function assertUserId(userId) {
    if (
        typeof userId !== 'string' ||
        userId.length < 1 ||
        userId.length > 200
    ) {
        const error = new Error('INVALID_USER_ID');
        error.status = 400;
        throw error;
    }
}

function assertDifferent(a, b) {
    if (a === b) {
        const error = new Error('SELF_RELATION_NOT_ALLOWED');
        error.status = 400;
        throw error;
    }
}

function userExists(userId) {
    return query(`
        SELECT user_id
        FROM users
        WHERE user_id = ${sql(userId)}
        LIMIT 1
    `).length > 0;
}

function assertTargetUser(userId) {
    assertUserId(userId);

    if (!userExists(userId)) {
        const error = new Error('USER_NOT_FOUND');
        error.status = 404;
        throw error;
    }
}

function canonicalPair(a, b) {
    return a < b ? [a, b] : [b, a];
}

function getFriendship(a, b) {
    const [userId, friendUserId] = canonicalPair(a, b);

    return query(`
        SELECT
            friendship_id,
            user_id,
            friend_user_id,
            requested_by_user_id,
            status,
            created_at,
            updated_at
        FROM friendships
        WHERE user_id = ${sql(userId)}
          AND friend_user_id = ${sql(friendUserId)}
        LIMIT 1
    `)[0] || null;
}

function requestFriend(currentUserId, targetUserId) {
    assertUserId(currentUserId);
    assertTargetUser(targetUserId);
    assertDifferent(currentUserId, targetUserId);

    const existing = getFriendship(
        currentUserId,
        targetUserId
    );

    if (existing) {
        if (existing.status === 'accepted') {
            const error = new Error('ALREADY_FRIENDS');
            error.status = 409;
            throw error;
        }

        if (
            existing.status === 'pending' &&
            existing.requested_by_user_id === currentUserId
        ) {
            return existing;
        }

        if (
            existing.status === 'pending' &&
            existing.requested_by_user_id !== currentUserId
        ) {
            return acceptFriend(
                currentUserId,
                targetUserId
            );
        }

        if (
            existing.status === 'rejected' ||
            existing.status === 'cancelled'
        ) {
            const [userId, friendUserId] =
                canonicalPair(
                    currentUserId,
                    targetUserId
                );

            run(`
                UPDATE friendships
                SET
                    status = 'pending',
                    requested_by_user_id = ${sql(currentUserId)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ${sql(userId)}
                  AND friend_user_id = ${sql(friendUserId)}
            `);

            return getFriendship(
                currentUserId,
                targetUserId
            );
        }
    }

    const [userId, friendUserId] =
        canonicalPair(
            currentUserId,
            targetUserId
        );

    const friendshipId = crypto.randomUUID();

    run(`
        INSERT INTO friendships (
            friendship_id,
            user_id,
            friend_user_id,
            requested_by_user_id,
            status
        )
        VALUES (
            ${sql(friendshipId)},
            ${sql(userId)},
            ${sql(friendUserId)},
            ${sql(currentUserId)},
            'pending'
        )
    `);

    return getFriendship(
        currentUserId,
        targetUserId
    );
}

function acceptFriend(currentUserId, targetUserId) {
    assertUserId(currentUserId);
    assertTargetUser(targetUserId);
    assertDifferent(currentUserId, targetUserId);

    const existing = getFriendship(
        currentUserId,
        targetUserId
    );

    if (!existing) {
        const error = new Error('FRIEND_REQUEST_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    if (existing.status === 'accepted') {
        return existing;
    }

    if (
        existing.status !== 'pending' ||
        existing.requested_by_user_id === currentUserId
    ) {
        const error = new Error('NOT_REQUEST_RECIPIENT');
        error.status = 403;
        throw error;
    }

    const [userId, friendUserId] =
        canonicalPair(
            currentUserId,
            targetUserId
        );

    run(`
        UPDATE friendships
        SET
            status = 'accepted',
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${sql(userId)}
          AND friend_user_id = ${sql(friendUserId)}
    `);

    return getFriendship(
        currentUserId,
        targetUserId
    );
}

function rejectFriend(currentUserId, targetUserId) {
    const existing = getFriendship(
        currentUserId,
        targetUserId
    );

    if (!existing) {
        const error = new Error('FRIEND_REQUEST_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    if (
        existing.status !== 'pending' ||
        existing.requested_by_user_id === currentUserId
    ) {
        const error = new Error('NOT_REQUEST_RECIPIENT');
        error.status = 403;
        throw error;
    }

    const [userId, friendUserId] =
        canonicalPair(
            currentUserId,
            targetUserId
        );

    run(`
        UPDATE friendships
        SET
            status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${sql(userId)}
          AND friend_user_id = ${sql(friendUserId)}
    `);

    return getFriendship(
        currentUserId,
        targetUserId
    );
}

function cancelFriend(currentUserId, targetUserId) {
    const existing = getFriendship(
        currentUserId,
        targetUserId
    );

    if (!existing) {
        const error = new Error('FRIEND_REQUEST_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    if (
        existing.status !== 'pending' ||
        existing.requested_by_user_id !== currentUserId
    ) {
        const error = new Error('NOT_REQUEST_SENDER');
        error.status = 403;
        throw error;
    }

    const [userId, friendUserId] =
        canonicalPair(
            currentUserId,
            targetUserId
        );

    run(`
        UPDATE friendships
        SET
            status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${sql(userId)}
          AND friend_user_id = ${sql(friendUserId)}
    `);

    return getFriendship(
        currentUserId,
        targetUserId
    );
}

function follow(currentUserId, targetUserId) {
    assertUserId(currentUserId);
    assertTargetUser(targetUserId);
    assertDifferent(currentUserId, targetUserId);

    const existing = query(`
        SELECT follow_id
        FROM follows
        WHERE follower_user_id = ${sql(currentUserId)}
          AND followed_user_id = ${sql(targetUserId)}
        LIMIT 1
    `);

    if (existing.length) {
        return {
            following: true,
            followId: existing[0].follow_id
        };
    }

    const followId = crypto.randomUUID();

    run(`
        INSERT INTO follows (
            follow_id,
            follower_user_id,
            followed_user_id
        )
        VALUES (
            ${sql(followId)},
            ${sql(currentUserId)},
            ${sql(targetUserId)}
        )
    `);

    return {
        following: true,
        followId
    };
}

function unfollow(currentUserId, targetUserId) {
    assertUserId(currentUserId);
    assertTargetUser(targetUserId);
    assertDifferent(currentUserId, targetUserId);

    run(`
        DELETE FROM follows
        WHERE follower_user_id = ${sql(currentUserId)}
          AND followed_user_id = ${sql(targetUserId)}
    `);

    return {
        following: false
    };
}

function listFriends(userId) {
    assertUserId(userId);

    return query(`
        SELECT
            u.user_id,
            u.username,
            u.display_name,
            u.avatar,
            u.bio,
            f.created_at
        FROM friendships f
        JOIN users u
          ON u.user_id =
             CASE
                 WHEN f.user_id = ${sql(userId)}
                 THEN f.friend_user_id
                 ELSE f.user_id
             END
        WHERE (
            f.user_id = ${sql(userId)}
            OR f.friend_user_id = ${sql(userId)}
        )
        AND f.status = 'accepted'
        ORDER BY f.updated_at DESC
    `);
}

function listFollowers(userId) {
    assertUserId(userId);

    return query(`
        SELECT
            u.user_id,
            u.username,
            u.display_name,
            u.avatar,
            u.bio,
            f.created_at
        FROM follows f
        JOIN users u
          ON u.user_id = f.follower_user_id
        WHERE f.followed_user_id = ${sql(userId)}
        ORDER BY f.created_at DESC
    `);
}

function listFollowing(userId) {
    assertUserId(userId);

    return query(`
        SELECT
            u.user_id,
            u.username,
            u.display_name,
            u.avatar,
            u.bio,
            f.created_at
        FROM follows f
        JOIN users u
          ON u.user_id = f.followed_user_id
        WHERE f.follower_user_id = ${sql(userId)}
        ORDER BY f.created_at DESC
    `);
}

function listIncomingRequests(userId) {
    assertUserId(userId);

    return query(`
        SELECT
            u.user_id,
            u.username,
            u.display_name,
            u.avatar,
            u.bio,
            f.friendship_id,
            f.created_at
        FROM friendships f
        JOIN users u
          ON u.user_id = f.requested_by_user_id
        WHERE (
            f.user_id = ${sql(userId)}
            OR f.friend_user_id = ${sql(userId)}
        )
        AND f.status = 'pending'
        AND f.requested_by_user_id != ${sql(userId)}
        ORDER BY f.created_at DESC
    `);
}

function listOutgoingRequests(userId) {
    assertUserId(userId);

    return query(`
        SELECT
            u.user_id,
            u.username,
            u.display_name,
            u.avatar,
            u.bio,
            f.friendship_id,
            f.created_at
        FROM friendships f
        JOIN users u
          ON u.user_id =
             CASE
                 WHEN f.requested_by_user_id = ${sql(userId)}
                 THEN
                     CASE
                         WHEN f.user_id = ${sql(userId)}
                         THEN f.friend_user_id
                         ELSE f.user_id
                     END
                 ELSE f.requested_by_user_id
             END
        WHERE f.requested_by_user_id = ${sql(userId)}
          AND f.status = 'pending'
        ORDER BY f.created_at DESC
    `);
}

function recordVisit(visitorUserId, visitedUserId) {
    assertUserId(visitorUserId);
    assertTargetUser(visitedUserId);
    assertDifferent(visitorUserId, visitedUserId);

    const visitId = crypto.randomUUID();

    run(`
        INSERT INTO visits (
            visit_id,
            visitor_user_id,
            visited_user_id
        )
        VALUES (
            ${sql(visitId)},
            ${sql(visitorUserId)},
            ${sql(visitedUserId)}
        )
    `);

    return {
        visitId
    };
}

function listVisitors(userId) {
    assertUserId(userId);

    return query(`
        SELECT
            u.user_id,
            u.username,
            u.display_name,
            u.avatar,
            u.bio,
            MAX(v.visited_at) AS visited_at
        FROM visits v
        JOIN users u
          ON u.user_id = v.visitor_user_id
        WHERE v.visited_user_id = ${sql(userId)}
        GROUP BY
            u.user_id,
            u.username,
            u.display_name,
            u.avatar,
            u.bio
        ORDER BY visited_at DESC
    `);
}

function getCounts(userId) {
    assertUserId(userId);

    const row = query(`
        SELECT
            (
                SELECT COUNT(*)
                FROM friendships f
                WHERE (
                    f.user_id = ${sql(userId)}
                    OR f.friend_user_id = ${sql(userId)}
                )
                AND f.status = 'accepted'
            ) AS friends,

            (
                SELECT COUNT(*)
                FROM follows
                WHERE follower_user_id = ${sql(userId)}
            ) AS following,

            (
                SELECT COUNT(*)
                FROM follows
                WHERE followed_user_id = ${sql(userId)}
            ) AS followers,

            (
                SELECT COUNT(DISTINCT visitor_user_id)
                FROM visits
                WHERE visited_user_id = ${sql(userId)}
            ) AS visitors
    `)[0];

    return {
        friends: Number(row.friends || 0),
        following: Number(row.following || 0),
        followers: Number(row.followers || 0),
        visitors: Number(row.visitors || 0)
    };
}

module.exports = {
    requestFriend,
    acceptFriend,
    rejectFriend,
    cancelFriend,
    follow,
    unfollow,
    listFriends,
    listFollowers,
    listFollowing,
    listIncomingRequests,
    listOutgoingRequests,
    recordVisit,
    listVisitors,
    getCounts
};
