const db = require('../database/db');
const crypto = require('crypto');

function purchaseItem(userId, itemType, itemId, idempotencyKey = null) {
    if (!userId || !itemType || !itemId) {
        throw new Error('بيانات الطلب غير مكتملة');
    }

    const db = require('../database/db');
    const crypto = require('crypto');

    const key = idempotencyKey || crypto.randomUUID();

    /*
     * حماية Idempotency:
     * إذا تم تنفيذ نفس المفتاح سابقًا، نعيد النتيجة السابقة
     * ولا نخصم Coins مرة ثانية.
     */
    const previous = db.query(
        `SELECT *
         FROM coin_transactions
         WHERE user_id = ?
           AND idempotency_key = ?
         LIMIT 1`,
        [userId, key]
    );

    if (previous.length) {
        return {
            success: true,
            duplicate: true,
            message: 'تم تنفيذ العملية سابقًا',
            remaining_balance: Number(previous[0].balance_after),
            transaction_id: previous[0].transaction_id
        };
    }

    /*
     * حاليًا حماية العملية الذرية تعتمد على sqlite3 CLI
     * في عملية واحدة حتى تكون BEGIN/COMMIT/ROLLBACK
     * على نفس اتصال SQLite.
     */
    const { execFileSync } = require('child_process');
    const { DB_PATH } = require('../database/db');

    const quote = value => {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
        return "'" + String(value).replace(/'/g, "''") + "'";
    };

    let wallet = db.query(
        `SELECT *
         FROM coin_wallets
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );

    if (!wallet.length) {
        db.run(
            `INSERT INTO coin_wallets
             (coin_wallet_id, user_id, balance_coins, version)
             VALUES (?, ?, 0, 0)`,
            [crypto.randomUUID(), userId]
        );

        wallet = db.query(
            `SELECT *
             FROM coin_wallets
             WHERE user_id = ?
             LIMIT 1`,
            [userId]
        );
    }

    const walletRow = wallet[0];
    const walletId = walletRow.coin_wallet_id;
    const currentBalance = Number(walletRow.balance_coins || 0);

    if (itemType === 'coin_package') {
        const pkgRows = db.query(
            `SELECT *
             FROM coin_packages
             WHERE package_id = ?
               AND is_active = 1
             LIMIT 1`,
            [itemId]
        );

        if (!pkgRows.length) {
            throw new Error('باقة الكوينز غير موجودة');
        }

        const pkg = pkgRows[0];
        const coinsToAdd = Number(pkg.total_coins || 0);

        if (!Number.isFinite(coinsToAdd) || coinsToAdd <= 0) {
            throw new Error('عدد الكوينز في الباقة غير صالح');
        }

        const balanceAfter = currentBalance + coinsToAdd;
        const transactionId = crypto.randomUUID();

        const sql = `
BEGIN IMMEDIATE;

INSERT INTO coin_wallets
(coin_wallet_id, user_id, balance_coins, version)
VALUES (
    ${quote(walletId)},
    ${quote(userId)},
    ${currentBalance},
    ${Number(walletRow.version || 0)}
)
ON CONFLICT(coin_wallet_id) DO UPDATE SET
    balance_coins = ${balanceAfter},
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO coin_transactions
(transaction_id, coin_wallet_id, user_id, type, direction,
 amount_coins, balance_before, balance_after,
 reference_type, reference_id, idempotency_key, description)
VALUES (
    ${quote(transactionId)},
    ${quote(walletId)},
    ${quote(userId)},
    'PACKAGE_PURCHASE',
    'credit',
    ${coinsToAdd},
    ${currentBalance},
    ${balanceAfter},
    'coin_package',
    ${quote(pkg.package_id)},
    ${quote(key)},
    ${quote('إضافة باقة كوينز: ' + pkg.title)}
);

COMMIT;
`;

        try {
            execFileSync(
                'sqlite3',
                ['-bail', DB_PATH, sql],
                { encoding: 'utf8' }
            );
        } catch (error) {
            throw new Error('PACKAGE_TRANSACTION_ROLLBACK');
        }

        return {
            success: true,
            duplicate: false,
            message: 'تمت إضافة الكوينز بنجاح',
            added_coins: coinsToAdd,
            remaining_balance: balanceAfter,
            transaction_id: transactionId,
            idempotency_key: key
        };
    }

    let price = 0;
    let description = '';
    let referenceType = itemType;
    let referenceId = itemId;
    let vipProduct = null;

    if (itemType === 'vip') {
        const rows = db.query(
            `SELECT *
             FROM vip_products
             WHERE (level = ? OR product_id = ? OR product_code = ?)
               AND is_active = 1
             LIMIT 1`,
            [itemId, itemId, itemId]
        );

        if (!rows.length) {
            throw new Error('منتج الـ VIP غير موجود');
        }

        vipProduct = rows[0];
        price = Number(vipProduct.price_coins || 0);
        description = `تفعيل اشتراك VIP مستوى ${vipProduct.level}`;
    } else if (itemType === 'lucky_spin' || itemType === 'millionaire') {
        price = itemType === 'millionaire' ? 500 : 100;
        description =
            itemType === 'millionaire'
                ? 'مسابقة المليونير'
                : 'لعبة الحظ السعيد';
    } else {
        throw new Error('نوع العنصر غير مدعوم');
    }

    if (!Number.isFinite(price) || price <= 0) {
        throw new Error('سعر العنصر غير صالح');
    }

    if (currentBalance < price) {
        throw new Error('رصيد الكوينز غير كافي لإتمام الشراء');
    }

    const balanceAfter = currentBalance - price;
    const transactionId = crypto.randomUUID();

    let vipPurchaseId = null;
    let startsAt = null;
    let expiresAt = null;

    if (itemType === 'vip') {
        const now = new Date();
        const durationDays = Number(vipProduct.duration_days || 30);
        const expires = new Date(now);
        expires.setDate(expires.getDate() + durationDays);

        vipPurchaseId = crypto.randomUUID();
        startsAt = now.toISOString();
        expiresAt = expires.toISOString();
    }

    const sql = `
BEGIN IMMEDIATE;

UPDATE coin_wallets
SET balance_coins = ${balanceAfter},
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE coin_wallet_id = ${quote(walletId)}
  AND balance_coins = ${currentBalance};

INSERT INTO coin_transactions
(transaction_id, coin_wallet_id, user_id, type, direction,
 amount_coins, balance_before, balance_after,
 reference_type, reference_id, idempotency_key, description)
VALUES (
    ${quote(transactionId)},
    ${quote(walletId)},
    ${quote(userId)},
    'PURCHASE',
    'debit',
    ${price},
    ${currentBalance},
    ${balanceAfter},
    ${quote(referenceType)},
    ${quote(referenceId)},
    ${quote(key)},
    ${quote(description)}
);

${itemType === 'vip' ? `
INSERT INTO vip_purchases
(purchase_id, user_id, product_id, product_code,
 membership_type, level, price_coins, duration_days,
 status, starts_at, expires_at, idempotency_key)
VALUES (
    ${quote(vipPurchaseId)},
    ${quote(userId)},
    ${quote(vipProduct.product_id)},
    ${quote(vipProduct.product_code)},
    ${quote(vipProduct.membership_type)},
    ${Number(vipProduct.level)},
    ${price},
    ${Number(vipProduct.duration_days || 30)},
    'COMPLETED',
    ${quote(startsAt)},
    ${quote(expiresAt)},
    ${quote(key)}
);
` : ''}

COMMIT;
`;

    try {
        execFileSync(
            'sqlite3',
            ['-bail', DB_PATH, sql],
            { encoding: 'utf8' }
        );
    } catch (error) {
        throw new Error('PURCHASE_TRANSACTION_ROLLBACK');
    }

    return {
        success: true,
        duplicate: false,
        message: 'تم الشراء والتفعيل بنجاح',
        remaining_balance: balanceAfter,
        transaction_id: transactionId,
        idempotency_key: key,
        vip_purchase_id: vipPurchaseId
    };
}
module.exports = {
    purchaseItem
};
