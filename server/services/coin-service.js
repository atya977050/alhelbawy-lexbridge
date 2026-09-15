const { randomUUID } = require('crypto');
const { query, run } = require('../database/db');

async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function ensureCoinWallet(userId) {
  let wallet = await get(
    `SELECT * FROM coin_wallets WHERE user_id = ?`,
    [userId]
  );

  if (!wallet) {
    const walletId = randomUUID();

    await run(
      `INSERT INTO coin_wallets
       (coin_wallet_id, user_id, balance_coins)
       VALUES (?, ?, 0)`,
      [walletId, userId]
    );

    wallet = await get(
      `SELECT * FROM coin_wallets WHERE user_id = ?`,
      [userId]
    );
  }

  return wallet;
}

async function getCoinWallet(userId) {
  return ensureCoinWallet(userId);
}

async function getPackages() {
  return query(
    `SELECT
       package_id,
       package_code,
       title,
       price_minor,
       currency,
       coins,
       bonus_coins,
       total_coins
     FROM coin_packages
     WHERE is_active = 1
     ORDER BY sort_order ASC, price_minor ASC`
  );
}

async function getTransactions(userId) {
  return query(
    `SELECT *
     FROM coin_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
}

async function createPurchaseIntent(userId, packageCode, idempotencyKey) {
  if (!idempotencyKey) {
    throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  }

  const existing = await get(
    `SELECT *
     FROM coin_purchases
     WHERE user_id = ? AND idempotency_key = ?`,
    [userId, idempotencyKey]
  );

  if (existing) {
    return existing;
  }

  const pkg = await get(
    `SELECT *
     FROM coin_packages
     WHERE package_code = ? AND is_active = 1`,
    [packageCode]
  );

  if (!pkg) {
    throw new Error('COIN_PACKAGE_NOT_FOUND');
  }

  const purchaseId = randomUUID();

  await run(
    `INSERT INTO coin_purchases
     (
       purchase_id,
       user_id,
       package_id,
       package_code,
       price_minor,
       currency,
       coins,
       bonus_coins,
       total_coins,
       status,
       idempotency_key
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    [
      purchaseId,
      userId,
      pkg.package_id,
      pkg.package_code,
      pkg.price_minor,
      pkg.currency,
      pkg.coins,
      pkg.bonus_coins,
      pkg.total_coins,
      idempotencyKey
    ]
  );

  return get(
    `SELECT *
     FROM coin_purchases
     WHERE purchase_id = ?`,
    [purchaseId]
  );
}

async function confirmPurchase(userId, purchaseId, paymentReference) {
  if (!paymentReference) {
    throw new Error('PAYMENT_REFERENCE_REQUIRED');
  }

  const purchase = await get(
    `SELECT *
     FROM coin_purchases
     WHERE purchase_id = ? AND user_id = ?`,
    [purchaseId, userId]
  );

  if (!purchase) {
    throw new Error('PURCHASE_NOT_FOUND');
  }

  if (purchase.status === 'COMPLETED') {
    return {
      purchase,
      wallet: await getCoinWallet(userId)
    };
  }

  if (purchase.status !== 'PENDING') {
    throw new Error('PURCHASE_NOT_PENDING');
  }

  const wallet = await ensureCoinWallet(userId);
  const before = Number(wallet.balance_coins);
  const after = before + Number(purchase.total_coins);

  await run(
    `UPDATE coin_wallets
     SET balance_coins = ?,
         version = version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [after, userId]
  );

  await run(
    `INSERT INTO coin_transactions
     (
       transaction_id,
       coin_wallet_id,
       user_id,
       type,
       direction,
       amount_coins,
       balance_before,
       balance_after,
       reference_type,
       reference_id,
       idempotency_key,
       description
     )
     VALUES (?, ?, ?, 'COIN_PURCHASE', 'credit', ?, ?, ?, 'coin_purchase', ?, ?, ?)`,
    [
      randomUUID(),
      wallet.coin_wallet_id,
      userId,
      purchase.total_coins,
      before,
      after,
      purchase.purchase_id,
      `purchase:${purchase.purchase_id}`,
      `شراء باقة ${purchase.package_code}`
    ]
  );

  await run(
    `UPDATE coin_purchases
     SET status = 'COMPLETED',
         payment_reference = ?
     WHERE purchase_id = ? AND user_id = ?`,
    [paymentReference, purchaseId, userId]
  );

  return {
    purchase: await get(
      `SELECT * FROM coin_purchases WHERE purchase_id = ?`,
      [purchaseId]
    ),
    wallet: await getCoinWallet(userId)
  };
}

async function debitCoins(
  userId,
  amount,
  referenceType,
  referenceId,
  description,
  idempotencyKey
) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('INVALID_COIN_AMOUNT');
  }

  if (!idempotencyKey) {
    throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  }

  const existing = await get(
    `SELECT *
     FROM coin_transactions
     WHERE user_id = ? AND idempotency_key = ?`,
    [userId, idempotencyKey]
  );

  if (existing) {
    return existing;
  }

  const wallet = await ensureCoinWallet(userId);
  const before = Number(wallet.balance_coins);

  if (before < amount) {
    throw new Error('INSUFFICIENT_COINS');
  }

  const after = before - amount;

  await run(
    `UPDATE coin_wallets
     SET balance_coins = ?,
         version = version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [after, userId]
  );

  await run(
    `INSERT INTO coin_transactions
     (
       transaction_id,
       coin_wallet_id,
       user_id,
       type,
       direction,
       amount_coins,
       balance_before,
       balance_after,
       reference_type,
       reference_id,
       idempotency_key,
       description
     )
     VALUES (?, ?, ?, 'PURCHASE', 'debit', ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      wallet.coin_wallet_id,
      userId,
      amount,
      before,
      after,
      referenceType,
      referenceId,
      idempotencyKey,
      description
    ]
  );

  return get(
    `SELECT *
     FROM coin_transactions
     WHERE user_id = ? AND idempotency_key = ?`,
    [userId, idempotencyKey]
  );
}

module.exports = {
  ensureCoinWallet,
  getCoinWallet,
  getPackages,
  getTransactions,
  createPurchaseIntent,
  confirmPurchase,
  debitCoins
};
