const {
    getCurrentSession
} = require('../services/auth-service');

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

function requireAuth(req, res, next) {
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

        req.auth = {
            token,
            session
        };

        // Compatibility layer:
        // جميع الـ routes القديمة التي تستخدم req.user
        // تعمل على نفس جلسة المستخدم المعتمدة.
        req.user = {
            ...session,
            user_id:
                session.user_id ||
                session.userId ||
                session.id ||
                session.user?.user_id ||
                session.user?.userId ||
                session.user?.id
        };

        next();
    } catch (error) {
        console.error(
            'AUTH_MIDDLEWARE_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر التحقق من الهوية'
        });
    }
}

module.exports = {
    extractToken,
    requireAuth
};
