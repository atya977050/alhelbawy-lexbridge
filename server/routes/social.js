const express = require('express');
const router = express.Router();

const { requireAuth } =
    require('../middleware/auth');

const social =
    require('../services/social-service');

function protectedRoute(handler) {
    return async (req, res) => {
        try {
            await requireAuth(req, res, () => {});
            if (!req.auth) return;

            await handler(req, res);
        } catch (error) {
            const status = error.status || 500;

            res.status(status).json({
                ok: false,
                error: error.message || 'SOCIAL_ERROR'
            });
        }
    };
}

router.use(express.json());

router.post(
    '/friends/request/:userId',
    protectedRoute(async (req, res) => {
        const data = social.requestFriend(
            req.auth.session.user_id,
            req.params.userId
        );

        res.json({
            ok: true,
            data
        });
    })
);

router.post(
    '/friends/:userId/accept',
    protectedRoute(async (req, res) => {
        const data = social.acceptFriend(
            req.auth.session.user_id,
            req.params.userId
        );

        res.json({
            ok: true,
            data
        });
    })
);

router.post(
    '/friends/:userId/reject',
    protectedRoute(async (req, res) => {
        const data = social.rejectFriend(
            req.auth.session.user_id,
            req.params.userId
        );

        res.json({
            ok: true,
            data
        });
    })
);

router.post(
    '/friends/:userId/cancel',
    protectedRoute(async (req, res) => {
        const data = social.cancelFriend(
            req.auth.session.user_id,
            req.params.userId
        );

        res.json({
            ok: true,
            data
        });
    })
);

router.get(
    '/friends',
    protectedRoute(async (req, res) => {
        res.json({
            ok: true,
            data: social.listFriends(
                req.auth.session.user_id
            )
        });
    })
);

router.get(
    '/friends/requests/incoming',
    protectedRoute(async (req, res) => {
        res.json({
            ok: true,
            data: social.listIncomingRequests(
                req.auth.session.user_id
            )
        });
    })
);

router.get(
    '/friends/requests/outgoing',
    protectedRoute(async (req, res) => {
        res.json({
            ok: true,
            data: social.listOutgoingRequests(
                req.auth.session.user_id
            )
        });
    })
);

router.post(
    '/follow/:userId',
    protectedRoute(async (req, res) => {
        const data = social.follow(
            req.auth.session.user_id,
            req.params.userId
        );

        res.json({
            ok: true,
            data
        });
    })
);

router.delete(
    '/follow/:userId',
    protectedRoute(async (req, res) => {
        const data = social.unfollow(
            req.auth.session.user_id,
            req.params.userId
        );

        res.json({
            ok: true,
            data
        });
    })
);

router.get(
    '/followers',
    protectedRoute(async (req, res) => {
        res.json({
            ok: true,
            data: social.listFollowers(
                req.auth.session.user_id
            )
        });
    })
);

router.get(
    '/following',
    protectedRoute(async (req, res) => {
        res.json({
            ok: true,
            data: social.listFollowing(
                req.auth.session.user_id
            )
        });
    })
);

router.post(
    '/visit/:userId',
    protectedRoute(async (req, res) => {
        const data = social.recordVisit(
            req.auth.session.user_id,
            req.params.userId
        );

        res.json({
            ok: true,
            data
        });
    })
);

router.get(
    '/visitors',
    protectedRoute(async (req, res) => {
        res.json({
            ok: true,
            data: social.listVisitors(
                req.auth.session.user_id
            )
        });
    })
);

router.get(
    '/counts',
    protectedRoute(async (req, res) => {
        res.json({
            ok: true,
            data: social.getCounts(
                req.auth.session.user_id
            )
        });
    })
);

module.exports = router;
