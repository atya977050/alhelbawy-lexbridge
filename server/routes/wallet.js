'use strict';

const express = require('express');
const wallet = require('../services/wallet-service');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        const data = {
            wallet: wallet.getWallet(userId),
            transactions: wallet.getTransactions(userId, 50)
        };

        res.json({
            ok: true,
            data
        });
    } catch (error) {
        console.error('[WALLET GET]', error);

        res.status(500).json({
            ok: false,
            message: error.message || 'تعذر تحميل المحفظة'
        });
    }
});

router.get('/transactions', (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        res.json({
            ok: true,
            data: {
                transactions: wallet.getTransactions(
                    userId,
                    req.query.limit
                )
            }
        });
    } catch (error) {
        console.error('[WALLET TRANSACTIONS]', error);

        res.status(500).json({
            ok: false,
            message: error.message || 'تعذر تحميل المعاملات'
        });
    }
});

module.exports = router;
