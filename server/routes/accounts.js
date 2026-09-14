const express = require('express');

const {
    createAccount,
    getAccount
} = require('../services/account-service');

const router = express.Router();

router.post('/register', (req, res) => {
    try {
        const {
            username,
            displayName,
            avatar,
            password
        } = req.body || {};

        const account =
            createAccount({
                username,
                displayName,
                avatar,
                password
            });

        return res.status(201).json({
            ok: true,
            message: 'تم إنشاء الحساب بنجاح',
            account
        });
    } catch (error) {
        if (error.code === 'USERNAME_EXISTS') {
            return res.status(409).json({
                ok: false,
                error: 'USERNAME_EXISTS',
                message: 'اسم المستخدم مستخدم بالفعل'
            });
        }

        if (
            error.message &&
            (
                error.message.includes('مطلوب') ||
                error.message.includes('يجب') ||
                error.message.includes('طويل') ||
                error.message.includes('يحتوي')
            )
        ) {
            return res.status(400).json({
                ok: false,
                error: 'VALIDATION_ERROR',
                message: error.message
            });
        }

        console.error(
            'ACCOUNT_REGISTER_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر إنشاء الحساب'
        });
    }
});

router.get('/:userId', (req, res) => {
    try {
        const account =
            getAccount(req.params.userId);

        if (!account) {
            return res.status(404).json({
                ok: false,
                error: 'ACCOUNT_NOT_FOUND',
                message: 'الحساب غير موجود'
            });
        }

        return res.json({
            ok: true,
            account
        });
    } catch (error) {
        console.error(
            'ACCOUNT_GET_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تحميل الحساب'
        });
    }
});

module.exports = router;
