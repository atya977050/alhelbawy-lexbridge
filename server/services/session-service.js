const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { DB_PATH } = require('../database/db');

const SESSION_DAYS = 30;

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
        { encoding: 'utf8' }
    ).trim();
}

function query(sqlText) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, sqlText],
        { encoding: 'utf8' }
    ).trim();

    return output ? JSON.parse(output) : [];
}

function hashToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

function createToken() {
    return crypto.randomBytes(48).toString('hex');
}

function getExpiryDate() {
    const expiresAt = new Date();

    expiresAt.setTime(
        expiresAt.getTime() +
        SESSION_DAYS * 24 * 60 * 60 * 1000
    );

    return expiresAt.toISOString();
}

function createSession(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم مطلوب');
    }

    const user = query(`
        SELECT user_id
        FROM users
        WHERE user_id = ${sql(userId)}
          AND status = 'active'
        LIMIT 1;
    `);

    if (user.length === 0) {
        const error = new Error('المستخدم غير موجود أو غير نشط');
        error.code = 'USER_NOT_FOUND';
        throw error;
    }

    const sessionId = crypto.randomUUID();
    const token = createToken();
    const tokenHash = hashToken(token);
    const expiresAt = getExpiryDate();

    const transaction = `
BEGIN;

INSERT INTO sessions (
    session_id,
    user_id,
    token_hash,
    expires_at
)
VALUES (
    ${sql(sessionId)},
    ${sql(userId)},
    ${sql(tokenHash)},
    ${sql(expiresAt)}
);

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

    return {
        sessionId,
        token,
        expiresAt
    };
}

function getSessionByToken(token) {
    if (!token) {
        return null;
    }

    const tokenHash = hashToken(token);

    const rows = query(`
        SELECT
            s.session_id,
            s.user_id,
            s.expires_at,
            s.created_at,
            u.username,
            u.display_name,
            u.avatar,
            u.status
        FROM sessions s
        INNER JOIN users u
            ON u.user_id = s.user_id
        WHERE s.token_hash = ${sql(tokenHash)}
          AND u.status = 'active'
        LIMIT 1;
    `);

    if (rows.length === 0) {
        return null;
    }

    const session = rows[0];

    if (
        !session.expires_at ||
        new Date(session.expires_at).getTime() <= Date.now()
    ) {
        revokeSessionById(session.session_id);
        return null;
    }

    return session;
}

function revokeSessionById(sessionId) {
    if (!sessionId) {
        return false;
    }

    const result = db(`
        DELETE FROM sessions
        WHERE session_id = ${sql(sessionId)};
        SELECT changes() AS changes;
    `);

    return result === '1';
}

function revokeSession(token) {
    if (!token) {
        return false;
    }

    const tokenHash = hashToken(token);

    const result = db(`
        DELETE FROM sessions
        WHERE token_hash = ${sql(tokenHash)};
        SELECT changes() AS changes;
    `);

    return result === '1';
}

function revokeAllUserSessions(userId) {
    if (!userId) {
        return false;
    }

    const result = db(`
        DELETE FROM sessions
        WHERE user_id = ${sql(userId)};
        SELECT changes() AS changes;
    `);

    return result === '1';
}

module.exports = {
    SESSION_DAYS,
    createSession,
    getSessionByToken,
    revokeSessionById,
    revokeSession,
    revokeAllUserSessions,
    hashToken
};
