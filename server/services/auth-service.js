const crypto = require('crypto');
const {
    execFileSync
} = require('child_process');

const {
    DB_PATH
} = require('../database/db');

const {
    createSession,
    getSessionByToken,
    revokeSession
} = require('./session-service');

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

function hashPassword(password) {
    const salt = crypto.randomBytes(16);

    const derivedKey = crypto.scryptSync(
        password,
        salt,
        64
    );

    return [
        'scrypt',
        salt.toString('hex'),
        derivedKey.toString('hex')
    ].join('$');
}

function verifyPassword(password, storedHash) {
    if (!password || !storedHash) {
        return false;
    }

    const parts = storedHash.split('$');

    if (
        parts.length !== 3 ||
        parts[0] !== 'scrypt'
    ) {
        return false;
    }

    try {
        const salt = Buffer.from(
            parts[1],
            'hex'
        );

        const expected = Buffer.from(
            parts[2],
            'hex'
        );

        const actual = crypto.scryptSync(
            password,
            salt,
            expected.length
        );

        return crypto.timingSafeEqual(
            actual,
            expected
        );
    } catch (_) {
        return false;
    }
}

function validatePassword(password) {
    if (!password) {
        throw new Error('كلمة المرور مطلوبة');
    }

    if (String(password).length < 8) {
        throw new Error(
            'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
        );
    }

    if (String(password).length > 200) {
        throw new Error(
            'كلمة المرور طويلة جداً'
        );
    }
}

function addPasswordToUser(
    userId,
    password
) {
    validatePassword(password);

    const passwordHash =
        hashPassword(password);

    db(`
        UPDATE users
        SET password_hash = ${sql(passwordHash)},
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${sql(userId)};
    `);

    return true;
}

function login(
    username,
    password
) {
    const normalizedUsername =
        String(username ?? '').trim();

    if (!normalizedUsername) {
        const error =
            new Error('اسم المستخدم مطلوب');

        error.code = 'USERNAME_REQUIRED';

        throw error;
    }

    validatePassword(password);

    const users = query(`
        SELECT
            user_id,
            username,
            display_name,
            avatar,
            status,
            password_hash
        FROM users
        WHERE username = ${sql(normalizedUsername)}
        LIMIT 1;
    `);

    if (users.length === 0) {
        const error =
            new Error('بيانات الدخول غير صحيحة');

        error.code = 'INVALID_CREDENTIALS';

        throw error;
    }

    const user = users[0];

    if (user.status !== 'active') {
        const error =
            new Error('الحساب غير نشط');

        error.code = 'ACCOUNT_INACTIVE';

        throw error;
    }

    if (
        !verifyPassword(
            password,
            user.password_hash
        )
    ) {
        const error =
            new Error('بيانات الدخول غير صحيحة');

        error.code = 'INVALID_CREDENTIALS';

        throw error;
    }

    const session =
        createSession(user.user_id);

    return {
        user: {
            user_id: user.user_id,
            username: user.username,
            display_name: user.display_name,
            avatar: user.avatar
        },
        session
    };
}

function getCurrentSession(token) {
    return getSessionByToken(token);
}

function logout(token) {
    return revokeSession(token);
}

module.exports = {
    hashPassword,
    verifyPassword,
    validatePassword,
    addPasswordToUser,
    login,
    getCurrentSession,
    logout
};
