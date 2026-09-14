const express = require('express');

const {
    requireAuth
} = require('../middleware/auth');

const {
    getRoomById,
    getMyRoom,
    updateRoom,
    startRoom,
    stopRoom
} = require('../services/room-service');

const {
    enterRoom,
    leaveRoom,
    getViewerCount
} = require('../services/room-presence-service');

const router = express.Router();

router.use(requireAuth);

router.get('/me', (req, res) => {
    try {
        const room =
            getMyRoom(
                req.auth.session.user_id
            );

        if (!room) {
            return res.status(404).json({
                ok: false,
                error: 'ROOM_NOT_FOUND',
                message: 'الغرفة الشخصية غير موجودة'
            });
        }

        return res.json({
            ok: true,
            room
        });
    } catch (error) {
        console.error(
            'ROOM_ME_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تحميل الغرفة'
        });
    }
});

router.patch('/me', (req, res) => {
    try {
        const room =
            getMyRoom(
                req.auth.session.user_id
            );

        if (!room) {
            return res.status(404).json({
                ok: false,
                error: 'ROOM_NOT_FOUND',
                message: 'الغرفة الشخصية غير موجودة'
            });
        }

        const updated =
            updateRoom(
                room.room_id,
                req.auth.session.user_id,
                req.body || {}
            );

        return res.json({
            ok: true,
            room: updated
        });
    } catch (error) {
        console.error(
            'ROOM_UPDATE_ERROR',
            error
        );

        if (
            error.code === 'ROOM_OWNER_REQUIRED'
        ) {
            return res.status(403).json({
                ok: false,
                error: error.code,
                message: error.message
            });
        }

        return res.status(400).json({
            ok: false,
            error: 'ROOM_UPDATE_FAILED',
            message: error.message
        });
    }
});

router.post('/me/start', (req, res) => {
    try {
        const room =
            getMyRoom(
                req.auth.session.user_id
            );

        if (!room) {
            return res.status(404).json({
                ok: false,
                error: 'ROOM_NOT_FOUND',
                message: 'الغرفة الشخصية غير موجودة'
            });
        }

        const liveRoom =
            startRoom(
                room.room_id,
                req.auth.session.user_id
            );

        return res.json({
            ok: true,
            room: liveRoom
        });
    } catch (error) {
        console.error(
            'ROOM_START_ERROR',
            error
        );

        return res.status(400).json({
            ok: false,
            error: 'ROOM_START_FAILED',
            message: error.message
        });
    }
});

router.post('/me/stop', (req, res) => {
    try {
        const room =
            getMyRoom(
                req.auth.session.user_id
            );

        if (!room) {
            return res.status(404).json({
                ok: false,
                error: 'ROOM_NOT_FOUND',
                message: 'الغرفة الشخصية غير موجودة'
            });
        }

        const stoppedRoom =
            stopRoom(
                room.room_id,
                req.auth.session.user_id
            );

        return res.json({
            ok: true,
            room: stoppedRoom
        });
    } catch (error) {
        console.error(
            'ROOM_STOP_ERROR',
            error
        );

        return res.status(400).json({
            ok: false,
            error: 'ROOM_STOP_FAILED',
            message: error.message
        });
    }
});

router.get('/:roomId', (req, res) => {
    try {
        const room =
            getRoomById(
                req.params.roomId
            );

        if (!room) {
            return res.status(404).json({
                ok: false,
                error: 'ROOM_NOT_FOUND',
                message: 'الغرفة غير موجودة'
            });
        }

        return res.json({
            ok: true,
            room
        });
    } catch (error) {
        console.error(
            'ROOM_GET_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'INTERNAL_ERROR',
            message: 'تعذر تحميل الغرفة'
        });
    }
});

router.post('/:roomId/enter', (req, res) => {
    try {
        const room =
            getRoomById(
                req.params.roomId
            );

        if (!room) {
            return res.status(404).json({
                ok: false,
                error: 'ROOM_NOT_FOUND',
                message: 'الغرفة غير موجودة'
            });
        }

        const isOwner =
            room.owner_user_id ===
            req.auth.session.user_id;

        if (!isOwner && room.status !== 'LIVE') {
            return res.status(409).json({
                ok: false,
                error: 'ROOM_NOT_LIVE',
                message: 'الغرفة غير متاحة حالياً'
            });
        }

        if (
            !isOwner &&
            room.is_locked
        ) {
            return res.status(403).json({
                ok: false,
                error: 'ROOM_LOCKED',
                message: 'الغرفة مغلقة للزوار'
            });
        }

        const currentCount =
            getViewerCount(
                room.room_id
            );

        if (
            !isOwner &&
            currentCount >= room.max_viewers
        ) {
            return res.status(409).json({
                ok: false,
                error: 'ROOM_FULL',
                message: 'الغرفة ممتلئة'
            });
        }

        const count =
            enterRoom(
                room.room_id,
                req.auth.session.user_id
            );

        const updated =
            getRoomById(
                room.room_id
            );

        return res.json({
            ok: true,
            entered: true,
            is_owner: isOwner,
            viewer_count: count,
            room: updated
        });
    } catch (error) {
        console.error(
            'ROOM_ENTER_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'ROOM_ENTER_FAILED',
            message: 'تعذر دخول الغرفة'
        });
    }
});

router.post('/:roomId/leave', (req, res) => {
    try {
        const count =
            leaveRoom(
                req.params.roomId,
                req.auth.session.user_id
            );

        return res.json({
            ok: true,
            left: true,
            viewer_count: count
        });
    } catch (error) {
        console.error(
            'ROOM_LEAVE_ERROR',
            error
        );

        return res.status(500).json({
            ok: false,
            error: 'ROOM_LEAVE_FAILED',
            message: 'تعذر مغادرة الغرفة'
        });
    }
});

module.exports = router;
