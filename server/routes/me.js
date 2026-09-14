const express = require('express');

const {
    requireAuth
} = require('../middleware/auth');

const {
    getMe
} = require('../services/me-service');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const data =
            getMe(
                req.auth.session.user_id
            );

        return res.json({
            ok: true,
            data
        });
    } catch (error) {
        console.error(
            'ME_ROUTE_ERROR',
            error
        );

        if (error.code === 'USER_NOT_FOUND') {
            return res.status(404).json({
                ok: false,
                error: error.code,
                message: error.message
            });
        }

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تحميل بيانات الحساب'
        });
    }
});

module.exports = router;
