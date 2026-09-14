const express = require('express');

const {
    login,
    getCurrentSession,
    logout
} = require('../services/auth-service');

const router = express.Router();

function extractToken(req) {
    const authorization =
        String(req.headers.authorization || '');

    if (!authorization) {
        return null;
    }

    const parts =
        authorization.split(/\s+/);

    if (
        parts.length !== 2 ||
        parts[0].toLowerCase() !== 'bearer'
    ) {
        return null;
    }

    return parts[1];
}

router.post('/login', (req, res) => {
    try {
        const {
            username,
            password
        } = req.body || {};

        const result =
            login(username, password);

        return res.status(200).json({
            ok: true,
            message: 'تم تسجيل الدخول بنجاح',
            user: result.user,
            session: result.session
        });
    } catch (error) {
        if (
            error.code === 'INVALID_CREDENTIALS'
        ) {
            return res.status(401).json({
                ok: false,
                error: 'INVALID_CREDENTIALS',
                message: 'بيانات الدخول غير صحيحة'
            });
        }

        if (
            error.code === 'ACCOUNT_INACTIVE'
        ) {
            return res.status(403).json({
                ok: false,
                error: 'ACCOUNT_INACTIVE',
                message: 'الحساب غير نشط'
            });
        }

        if (
            error.code === 'USERNAME_REQUIRED' ||
            (
                error.message &&
                error.message.includes('كلمة المرور')
            )
        ) {
            return res.status(400).json({
                ok: false,
                error: 'VALIDATION_ERROR',
                message: error.message
            });
        }

        console.error(
            'AUTH_LOGIN_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'حدث خطأ أثناء تسجيل الدخول'
        });
    }
});

router.get('/me', (req, res) => {
    try {
        const token =
            extractToken(req);

        if (!token) {
            return res.status(401).json({
                ok: false,
                error: 'AUTH_REQUIRED',
                message: 'تسجيل الدخول مطلوب'
            });
        }

        const session =
            getCurrentSession(token);

        if (!session) {
            return res.status(401).json({
                ok: false,
                error: 'INVALID_SESSION',
                message: 'الجلسة غير صالحة أو منتهية'
            });
        }

        return res.json({
            ok: true,
            user: {
                user_id: session.user_id,
                username: session.username,
                display_name: session.display_name,
                avatar: session.avatar,
                status: session.status
            },
            session: {
                session_id: session.session_id,
                expires_at: session.expires_at,
                created_at: session.created_at
            }
        });
    } catch (error) {
        console.error(
            'AUTH_ME_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر التحقق من الجلسة'
        });
    }
});

router.post('/logout', (req, res) => {
    try {
        const token =
            extractToken(req);

        if (!token) {
            return res.status(401).json({
                ok: false,
                error: 'AUTH_REQUIRED',
                message: 'تسجيل الدخول مطلوب'
            });
        }

        const revoked =
            logout(token);

        return res.json({
            ok: true,
            message: 'تم تسجيل الخروج بنجاح',
            revoked
        });
    } catch (error) {
        console.error(
            'AUTH_LOGOUT_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تسجيل الخروج'
        });
    }
});

module.exports = router;
