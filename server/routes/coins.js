const express = require('express');
const router = express.Router();

const coinService = require('../services/coin-service');

function userId(req) {
  return (
    req.user?.user_id ||
    req.user?.userId ||
    req.user?.id
  );
}

router.get('/packages', async (req, res) => {
  try {
    res.json({
      ok: true,
      packages: await coinService.getPackages()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.get('/wallet', async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED'
      });
    }

    res.json({
      ok: true,
      wallet: await coinService.getCoinWallet(id)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED'
      });
    }

    res.json({
      ok: true,
      transactions: await coinService.getTransactions(id)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.post('/purchases', async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED'
      });
    }

    const packageCode = String(req.body?.package_code || '');
    const idempotencyKey =
      req.get('Idempotency-Key') ||
      req.body?.idempotency_key;

    const purchase = await coinService.createPurchaseIntent(
      id,
      packageCode,
      idempotencyKey
    );

    res.status(201).json({
      ok: true,
      purchase,
      payment_required: true
    });
  } catch (error) {
    const known = [
      'IDEMPOTENCY_KEY_REQUIRED',
      'COIN_PACKAGE_NOT_FOUND'
    ];

    res.status(known.includes(error.message) ? 400 : 500).json({
      ok: false,
      error: error.message
    });
  }
});

router.post('/purchases/:purchaseId/confirm', async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED'
      });
    }

    const result = await coinService.confirmPurchase(
      id,
      req.params.purchaseId,
      req.body?.payment_reference
    );

    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const known = [
      'PAYMENT_REFERENCE_REQUIRED',
      'PURCHASE_NOT_FOUND',
      'PURCHASE_NOT_PENDING'
    ];

    res.status(known.includes(error.message) ? 400 : 500).json({
      ok: false,
      error: error.message
    });
  }
});

module.exports = router;
