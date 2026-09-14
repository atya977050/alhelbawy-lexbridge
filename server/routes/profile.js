const express = require('express');

const {
    requireAuth
} = require('../middleware/auth');

const {
    getProfile,
    updateProfile,
    recordVisit
} = require('../services/profile-service');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
    try {
        const profile =
            getProfile(req.auth.session.user_id);

        if (!profile) {
            return res.status(404).json({
                ok: false,
                error: 'ACCOUNT_NOT_FOUND',
                message: 'الحساب غير موجود'
            });
        }

        return res.json({
            ok: true,
            profile
        });
    } catch (error) {
        console.error(
            'PROFILE_ME_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تحميل الملف الشخصي'
        });
    }
});

router.patch('/me', requireAuth, (req, res) => {
    try {
        const {
            displayName,
            avatar,
            bio
        } = req.body || {};

        const profile =
            updateProfile(
                req.auth.session.user_id,
                {
                    displayName,
                    avatar,
                    bio
                }
            );

        return res.json({
            ok: true,
            message: 'تم تحديث الملف الشخصي',
            profile
        });
    } catch (error) {
        if (
            error.code === 'ACCOUNT_NOT_FOUND'
        ) {
            return res.status(404).json({
                ok: false,
                error: 'ACCOUNT_NOT_FOUND',
                message: 'الحساب غير موجود'
            });
        }

        if (
            error.message &&
            (
                error.message.includes('مطلوب') ||
                error.message.includes('طويل')
            )
        ) {
            return res.status(400).json({
                ok: false,
                error: 'VALIDATION_ERROR',
                message: error.message
            });
        }

        console.error(
            'PROFILE_UPDATE_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تحديث الملف الشخصي'
        });
    }
});

router.get('/:userId', requireAuth, (req, res) => {
    try {
        const profile =
            getProfile(req.params.userId);

        if (!profile) {
            return res.status(404).json({
                ok: false,
                error: 'ACCOUNT_NOT_FOUND',
                message: 'الحساب غير موجود'
            });
        }

        if (
            req.auth.session.user_id !==
            req.params.userId
        ) {
            try {
                recordVisit(
                    req.auth.session.user_id,
                    req.params.userId
                );
            } catch (visitError) {
                console.error(
                    'PROFILE_VISIT_ERROR',
                    visitError
                );
            }
        }

        const refreshed =
            getProfile(req.params.userId);

        return res.json({
            ok: true,
            profile: refreshed
        });
    } catch (error) {
        console.error(
            'PROFILE_GET_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تحميل الملف الشخصي'
        });
    }
});

module.exports = router;
