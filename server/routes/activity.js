'use strict';

const express = require('express');
const activity = require('../services/activity-service');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


function protectedRoute(handler) {
    return async (req, res, next) => {
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

            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}



router.get(
    '/',
    protectedRoute(async (req, res) => {
        const roomId =
            typeof req.query.roomId === 'string'
                ? req.query.roomId.trim()
                : '';

        const data = {
            platform: activity.getPlatformItems(),
            room: roomId
                ? activity.getRoomActivity(roomId)
                : [],
            events: activity.getRecentEvents(req.user.user_id)
        };

        res.json({
            ok: true,
            data
        });
    })
);

router.post(
    '/event',
    protectedRoute(async (req, res) => {
        const key =
            typeof req.body?.key === 'string'
                ? req.body.key.trim()
                : '';

        const item =
            activity.getPlatformItems()
                .find(x => x.key === key);

        if (!item) {
            return res.status(400).json({
                ok: false,
                error: 'النشاط غير معروف'
            });
        }

        const event = activity.createActivityEvent(
            req.user.user_id,
            item.key,
            item.title,
            item.description
        );

        res.status(201).json({
            ok: true,
            data: {
                event
            }
        });
    })
);

module.exports = router;
