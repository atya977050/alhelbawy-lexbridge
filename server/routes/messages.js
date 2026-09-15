'use strict';

const express = require('express');
const messageService = require('../services/message-service');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res, next) => {
    try {
        const limit = req.query.limit;

        res.json({
            ok: true,
            data: {
                unreadCount:
                    messageService.getUnreadCount(req.user.user_id),

                notifications:
                    messageService.getNotifications(
                        req.user.user_id,
                        limit
                    ),

                events:
                    messageService.getEvents(
                        req.user.user_id,
                        limit
                    )
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/notifications', (req, res, next) => {
    try {
        res.json({
            ok: true,
            data: {
                unreadCount:
                    messageService.getUnreadCount(req.user.user_id),

                notifications:
                    messageService.getNotifications(
                        req.user.user_id,
                        req.query.limit
                    )
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/events', (req, res, next) => {
    try {
        res.json({
            ok: true,
            data: {
                events:
                    messageService.getEvents(
                        req.user.user_id,
                        req.query.limit
                    )
            }
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/notifications/:notificationId/read', (req, res, next) => {
    try {
        messageService.markNotificationRead(
            req.user.user_id,
            req.params.notificationId
        );

        res.json({
            ok: true
        });
    } catch (error) {
        next(error);
    }
});

router.post('/notifications/read-all', (req, res, next) => {
    try {
        messageService.markAllNotificationsRead(
            req.user.user_id
        );

        res.json({
            ok: true
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
