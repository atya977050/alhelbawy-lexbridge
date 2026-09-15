'use strict';

const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DB_PATH =
    process.env.LEXBRIDGE_DB_PATH ||
    path.join(__dirname, '..', '..', 'data', 'lexbridge.sqlite');

function fail(message) {
    const error = new Error(message);
    error.code = 'WALLET_ERROR';
    throw error;
}

function uuid() {
    return crypto.randomUUID();
}

function sqlQuote(value) {
    return "'" + String(value).replace(/'/g, "''") + "'";
}

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

function ensureWallet(userId) {
    if (!userId) {
        fail('معرف المستخدم مطلوب');
    }

    const existing = runRead(
        `SELECT *
         FROM wallets
         WHERE user_id = ${sqlQuote(userId)}
         LIMIT 1;`
    );

    if (existing.length) {
        return existing[0];
    }

    const walletId = uuid();

    runWrite(`
        INSERT INTO wallets (
            wallet_id,
            user_id,
            currency,
            available_minor,
            reserved_minor,
            version
        )
        VALUES (
            ${sqlQuote(walletId)},
            ${sqlQuote(userId)},
            'EGP',
            0,
            0,
            0
        );
    `);

    return getWallet(userId);
}

function getWallet(userId) {
    if (!userId) {
        fail('معرف المستخدم مطلوب');
    }

    let rows = runRead(`
        SELECT
            wallet_id,
            user_id,
            currency,
            available_minor,
            reserved_minor,
            version,
            created_at,
            updated_at
        FROM wallets
        WHERE user_id = ${sqlQuote(userId)}
        LIMIT 1;
    `);

    if (!rows.length) {
        return ensureWallet(userId);
    }

    return rows[0];
}

function getTransactions(userId, limit = 50) {
    if (!userId) {
        fail('معرف المستخدم مطلوب');
    }

    let safeLimit = Number(limit);

    if (!Number.isInteger(safeLimit) || safeLimit < 1) {
        safeLimit = 50;
    }

    safeLimit = Math.min(safeLimit, 100);

    return runRead(`
        SELECT
            transaction_id,
            wallet_id,
            user_id,
            type,
            direction,
            amount_minor,
            balance_before_minor,
            balance_after_minor,
            reference_type,
            reference_id,
            description,
            created_at
        FROM wallet_transactions
        WHERE user_id = ${sqlQuote(userId)}
        ORDER BY created_at DESC
        LIMIT ${safeLimit};
    `);
}

function credit(userId, amountMinor, options = {}) {
    if (!userId) {
        fail('معرف المستخدم مطلوب');
    }

    const amount = Number(amountMinor);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
        fail('قيمة الإضافة غير صحيحة');
    }

    const wallet = getWallet(userId);
    const before = Number(wallet.available_minor);
    const after = before + amount;

    if (!Number.isSafeInteger(after)) {
        fail('الرصيد تجاوز الحد المسموح');
    }

    const transactionId = uuid();
    const idempotencyKey =
        options.idempotencyKey == null
            ? null
            : String(options.idempotencyKey);

    if (idempotencyKey) {
        const existing = runRead(`
            SELECT *
            FROM wallet_transactions
            WHERE idempotency_key = ${sqlQuote(idempotencyKey)}
            LIMIT 1;
        `);

        if (existing.length) {
            return {
                wallet: getWallet(userId),
                transaction: existing[0],
                idempotent: true
            };
        }
    }

    const type = options.type || 'credit';
    const referenceType = options.referenceType || null;
    const referenceId = options.referenceId || null;
    const description = options.description || null;

    runWrite(`
        BEGIN IMMEDIATE;

        UPDATE wallets
        SET
            available_minor = ${after},
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${sqlQuote(userId)};

        INSERT INTO wallet_transactions (
            transaction_id,
            wallet_id,
            user_id,
            type,
            direction,
            amount_minor,
            balance_before_minor,
            balance_after_minor,
            reference_type,
            reference_id,
            idempotency_key,
            description
        )
        VALUES (
            ${sqlQuote(transactionId)},
            ${sqlQuote(wallet.wallet_id)},
            ${sqlQuote(userId)},
            ${sqlQuote(type)},
            'credit',
            ${amount},
            ${before},
            ${after},
            ${referenceType === null ? 'NULL' : sqlQuote(referenceType)},
            ${referenceId === null ? 'NULL' : sqlQuote(referenceId)},
            ${idempotencyKey === null ? 'NULL' : sqlQuote(idempotencyKey)},
            ${description === null ? 'NULL' : sqlQuote(description)}
        );

        COMMIT;
    `);

    return {
        wallet: getWallet(userId),
        transaction: getTransactions(userId, 1)[0],
        idempotent: false
    };
}

function debit(userId, amountMinor, options = {}) {
    if (!userId) {
        fail('معرف المستخدم مطلوب');
    }

    const amount = Number(amountMinor);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
        fail('قيمة الخصم غير صحيحة');
    }

    const wallet = getWallet(userId);
    const before = Number(wallet.available_minor);

    if (before < amount) {
        const error = new Error('الرصيد غير كافٍ');
        error.code = 'INSUFFICIENT_FUNDS';
        throw error;
    }

    const after = before - amount;

    const idempotencyKey =
        options.idempotencyKey == null
            ? null
            : String(options.idempotencyKey);

    if (idempotencyKey) {
        const existing = runRead(`
            SELECT *
            FROM wallet_transactions
            WHERE idempotency_key = ${sqlQuote(idempotencyKey)}
            LIMIT 1;
        `);

        if (existing.length) {
            return {
                wallet: getWallet(userId),
                transaction: existing[0],
                idempotent: true
            };
        }
    }

    const transactionId = uuid();
    const type = options.type || 'debit';
    const referenceType = options.referenceType || null;
    const referenceId = options.referenceId || null;
    const description = options.description || null;

    runWrite(`
        BEGIN IMMEDIATE;

        UPDATE wallets
        SET
            available_minor = ${after},
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE
            user_id = ${sqlQuote(userId)}
            AND available_minor >= ${amount};

        INSERT INTO wallet_transactions (
            transaction_id,
            wallet_id,
            user_id,
            type,
            direction,
            amount_minor,
            balance_before_minor,
            balance_after_minor,
            reference_type,
            reference_id,
            idempotency_key,
            description
        )
        VALUES (
            ${sqlQuote(transactionId)},
            ${sqlQuote(wallet.wallet_id)},
            ${sqlQuote(userId)},
            ${sqlQuote(type)},
            'debit',
            ${amount},
            ${before},
            ${after},
            ${referenceType === null ? 'NULL' : sqlQuote(referenceType)},
            ${referenceId === null ? 'NULL' : sqlQuote(referenceId)},
            ${idempotencyKey === null ? 'NULL' : sqlQuote(idempotencyKey)},
            ${description === null ? 'NULL' : sqlQuote(description)}
        );

        COMMIT;
    `);

    return {
        wallet: getWallet(userId),
        transaction: getTransactions(userId, 1)[0],
        idempotent: false
    };
}

module.exports = {
    ensureWallet,
    getWallet,
    getTransactions,
    credit,
    debit
};
