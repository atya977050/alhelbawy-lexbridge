'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const features = require('../services/feature-service');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        res.json({
            ok: true,
            data: features.getFeatures(userId)
        });
    } catch (error) {
        console.error('[FEATURES_GET]', error);

        res.status(500).json({
            ok: false,
            error: 'تعذر تحميل المميزات'
        });
    }
});

router.post('/:featureKey/activate', (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        const data =
            features.activateFeature(
                userId,
                req.params.featureKey
            );

        res.json({
            ok: true,
            data
        });
    } catch (error) {
        console.error('[FEATURES_ACTIVATE]', error);

        if (error.code === 'FEATURE_NOT_FOUND') {
            return res.status(404).json({
                ok: false,
                error: error.message
            });
        }

        if (error.code === 'FEATURE_LOCKED') {
            return res.status(403).json({
                ok: false,
                error: error.message
            });
        }

        res.status(500).json({
            ok: false,
            error: 'تعذر تفعيل الميزة'
        });
    }
});

module.exports = router;
