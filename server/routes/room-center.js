const express = require('express');
const router = express.Router();

const {
    requireAuth
} = require('../middleware/auth');

const roomCenter =
    require('../services/room-center-service');

function protectedRoute(handler) {
    return async (req, res) => {
        try {
            await new Promise((resolve, reject) => {
                requireAuth(req, res, (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });

            if (!req.auth) {
                return;
            }

            await handler(req, res);
        } catch (error) {
            const status = error.status || 500;

            res.status(status).json({
                ok: false,
                error: error.message || 'ROOM_CENTER_ERROR'
            });
        }
    };
}

router.get(
    '/available',
    protectedRoute(async (req, res) => {
        const rooms = roomCenter.getAvailableRooms();

        res.json({
            ok: true,
            data: {
                rooms
            }
        });
    })
);

router.get(
    '/',
    protectedRoute(async (req, res) => {
        const data =
            roomCenter.getRoomCenter(
                req.auth.session.user_id
            );

        res.json({
            ok: true,
            data
        });
    })
);

router.patch(
    '/',
    protectedRoute(async (req, res) => {
        const data =
            roomCenter.updateRoomCenter(
                req.auth.session.user_id,
                req.body || {}
            );

        res.json({
            ok: true,
            message: 'تم تحديث إعدادات الغرفة',
            data
        });
    })
);

router.post(
    '/start',
    protectedRoute(async (req, res) => {
        const data =
            roomCenter.startRoomCenter(
                req.auth.session.user_id
            );

        res.json({
            ok: true,
            message: 'تم تشغيل الغرفة',
            data
        });
    })
);

router.post(
    '/stop',
    protectedRoute(async (req, res) => {
        const data =
            roomCenter.stopRoomCenter(
                req.auth.session.user_id
            );

        res.json({
            ok: true,
            message: 'تم إيقاف الغرفة',
            data
        });
    })
);

router.get(
    '/share',
    protectedRoute(async (req, res) => {
        const data =
            roomCenter.getShareData(
                req,
                req.auth.session.user_id
            );

        res.json({
            ok: true,
            data
        });
    })
);

module.exports = router;
