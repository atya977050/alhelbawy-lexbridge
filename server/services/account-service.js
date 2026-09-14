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

function validateUsername(username) {
    const value =
        String(username ?? '').trim();

    if (!value) {
        throw new Error('اسم المستخدم مطلوب');
    }

    if (value.length < 3) {
        throw new Error(
            'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'
        );
    }

    if (value.length > 50) {
        throw new Error(
            'اسم المستخدم طويل جداً'
        );
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
        throw new Error(
            'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام و _ أو - أو . فقط'
        );
    }

    return value;
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

function validatePassword(password) {
    if (!password) {
        throw new Error('كلمة المرور مطلوبة');
    }

    const value =
        String(password);

    if (value.length < 8) {
        throw new Error(
            'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
        );
    }

    if (value.length > 200) {
        throw new Error(
            'كلمة المرور طويلة جداً'
        );
    }

    return value;
}

function hashPassword(password) {
    const salt =
        crypto.randomBytes(16);

    const derivedKey =
        crypto.scryptSync(
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

function createAccount({
    username,
    displayName,
    avatar = null,
    password
}) {
    const normalizedUsername =
        validateUsername(username);

    const normalizedDisplayName =
        validateDisplayName(displayName);

    const normalizedPassword =
        validatePassword(password);

    const existing =
        query(`
            SELECT user_id
            FROM users
            WHERE username = ${sql(normalizedUsername)}
            LIMIT 1;
        `);

    if (existing.length > 0) {
        const error =
            new Error('اسم المستخدم مستخدم بالفعل');

        error.code =
            'USERNAME_EXISTS';

        throw error;
    }

    const userId =
        crypto.randomUUID();

    const roomId =
        crypto.randomUUID();

    const walletId =
        crypto.randomUUID();

    const passwordHash =
        hashPassword(normalizedPassword);

    const transaction = `
BEGIN;

INSERT INTO users (
    user_id,
    username,
    display_name,
    avatar,
    password_hash,
    status
)
VALUES (
    ${sql(userId)},
    ${sql(normalizedUsername)},
    ${sql(normalizedDisplayName)},
    ${sql(avatar)},
    ${sql(passwordHash)},
    'active'
);

INSERT INTO rooms (
    room_id,
    owner_user_id,
    name,
    description,
    status
)
VALUES (
    ${sql(roomId)},
    ${sql(userId)},
    ${sql(`غرفة ${normalizedDisplayName}`)},
    NULL,
    'INACTIVE'
);

INSERT INTO wallets (
    wallet_id,
    user_id,
    currency,
    available_minor,
    reserved_minor,
    version
)
VALUES (
    ${sql(walletId)},
    ${sql(userId)},
    'EGP',
    0,
    0,
    0
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

    return getAccount(userId);
}

function getAccount(userId) {
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
                u.status,
                u.created_at,
                u.updated_at,

                r.room_id,
                r.name AS room_name,
                r.description AS room_description,
                r.status AS room_status,

                w.wallet_id,
                w.currency,
                w.available_minor,
                w.reserved_minor,
                w.version AS wallet_version

            FROM users u

            LEFT JOIN rooms r
                ON r.owner_user_id = u.user_id

            LEFT JOIN wallets w
                ON w.user_id = u.user_id

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
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at
        },

        room: {
            room_id: row.room_id,
            name: row.room_name,
            description: row.room_description,
            status: row.room_status
        },

        wallet: {
            wallet_id: row.wallet_id,
            currency: row.currency,
            available_minor: row.available_minor,
            reserved_minor: row.reserved_minor,
            version: row.wallet_version
        }
    };
}

module.exports = {
    createAccount,
    getAccount,
    validateUsername,
    validateDisplayName,
    validatePassword,
    hashPassword
};
