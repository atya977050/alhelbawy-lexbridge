const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const engine = require('../services/room-engine-service');

function protectedRoute(handler) {
    return (req, res) => {
        requireAuth(req, res, () => {
            try {
                handler(req, res);
            } catch (err) {
                res.status(err.status || 500).json({
                    ok: false,
                    error: err.message || 'ROOM_ENGINE_ERROR'
                });
            }
        });
    };
}

router.get('/:roomId', protectedRoute((req, res) => {
    res.json({
        ok: true,
        data: engine.getEngineState(req.params.roomId)
    });
}));

router.post('/start', protectedRoute((req, res) => {
    res.json({
        ok: true,
        message: 'تم تشغيل محرك الغرفة',
        data: engine.start(req.auth.session.user_id)
    });
}));

router.post('/stop', protectedRoute((req, res) => {
    res.json({
        ok: true,
        message: 'تم إيقاف محرك الغرفة',
        data: engine.stop(req.auth.session.user_id)
    });
}));

router.post('/:roomId/join', protectedRoute((req, res) => {
    res.json({
        ok: true,
        message: 'تم دخول الغرفة',
        data: engine.join(
            req.params.roomId,
            req.auth.session.user_id
        )
    });
}));

router.post('/:roomId/leave', protectedRoute((req, res) => {
    res.json({
        ok: true,
        message: 'تم الخروج من الغرفة',
        data: engine.leave(
            req.params.roomId,
            req.auth.session.user_id
        )
    });
}));

router.get('/:roomId/role', protectedRoute((req, res) => {
    res.json({
        ok: true,
        data: engine.getRoomRole(
            req.params.roomId,
            req.auth.session.user_id
        )
    });
}));

module.exports = router;
