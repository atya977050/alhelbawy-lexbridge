const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware للتحقق من صلاحيات المدير (Admin Check)
function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');
    
    // يمكنك ربطها بجدول الجلسات أو التحقق من دور المستخدم (role = 'admin')
    const session = db.query("SELECT * FROM sessions WHERE token_hash = ? LIMIT 1", [require('crypto').createHash('sha256').update(token).digest('hex')]);
    
    if (!session.length) {
        return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
    }

    const user = db.query("SELECT * FROM users WHERE user_id = ? AND (role = 'admin' OR is_admin = 1) LIMIT 1", [session[0].user_id]);
    
    if (!user.length) {
        // للتهيئة السريعة، إذا كان أول المستخدمين أو حسب الطلب، يمكن تجاوزها أو تشديدها
        // حالياً نتحقق من صلاحية المدير
        return res.status(403).json({ success: false, message: 'صلاحيات إدارية مطلوبة' });
    }

    req.adminUser = user[0];
    next();
}

// 1. لوحة التحكم - الإحصائيات العامة
router.get('/stats', (req, res) => {
    try {
        const usersCount = db.query("SELECT COUNT(*) as count FROM users")[0].count;
        const roomsCount = db.query("SELECT COUNT(*) as count FROM rooms")[0].count;
        const activeVips = db.query("SELECT COUNT(*) as count FROM vip_purchases WHERE status = 'ACTIVE'")[0].count;
        const totalTransactions = db.query("SELECT SUM(amount) as total FROM coin_transactions")[0].total || 0;

        res.json({
            success: true,
            stats: {
                users: usersCount,
                rooms: roomsCount,
                active_vips: activeVips,
                total_transactions: totalTransactions
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. إدارة المستخدمين (عرض، تعديل، حذف، تفعيل)
router.get('/users', (req, res) => {
    const users = db.query("SELECT user_id, username, display_name, role, status, created_at FROM users ORDER BY created_at DESC");
    res.json({ success: true, users });
});

router.put('/users/:id', (req, res) => {
    const { status, role, display_name } = req.body;
    const userId = req.params.id;
    
    db.run(
        "UPDATE users SET status = COALESCE(?, status), role = COALESCE(?, role), display_name = COALESCE(?, display_name) WHERE user_id = ?",
        [status, role, display_name, userId]
    );
    res.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح' });
});

router.delete('/users/:id', (req, res) => {
    const userId = req.params.id;
    db.run("DELETE FROM users WHERE user_id = ?", [userId]);
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح وتنظيف بياناته' });
});

// 3. إدارة باقات الـ VIP (من 1 إلى 6) والمنتجات
router.get('/vip/products', (req, res) => {
    const products = db.query("SELECT * FROM vip_products ORDER BY level ASC");
    res.json({ success: true, products });
});

router.post('/vip/assign', (req, res) => {
    const { user_id, product_id, level } = req.body;
    const crypto = require('crypto');
    
    let prodId = product_id;
    if (!prodId && level) {
        const p = db.query("SELECT product_id FROM vip_products WHERE level = ? LIMIT 1", [level]);
        if (p.length) prodId = p[0].product_id;
    }

    if (!prodId) return res.status(400).json({ success: false, message: 'معرف أو مستوى الـ VIP مطلوب' });

    db.run(
        "INSERT INTO vip_purchases (purchase_id, user_id, product_id, status) VALUES (?, ?, ?, 'ACTIVE')",
        [crypto.randomUUID(), user_id, prodId]
    );
    res.json({ success: true, message: `تم تفعيل اشتراك VIP للمستخدم بنجاح` });
});

// 4. إدارة الغرف والتنظيف العام (Clear / Reset / Stop)
router.get('/rooms', (req, res) => {
    const rooms = db.query("SELECT * FROM rooms ORDER BY created_at DESC");
    res.json({ success: true, rooms });
});

router.post('/rooms/:id/stop', (req, res) => {
    const roomId = req.params.id;
    db.run("UPDATE rooms SET status = 'INACTIVE' WHERE room_id = ?", [roomId]);
    db.run("DELETE FROM room_seats WHERE room_id = ?", [roomId]);
    res.json({ success: true, message: 'تم إيقاف الغرفة وتنظيف المقاعد بنجاح' });
});

router.post('/system/cleanup', (req, res) => {
    // تنظيف الغرف غير النشطة والجلسات المنتهية
    db.run("DELETE FROM sessions WHERE datetime(expires_at) < datetime('now')");
    db.run("UPDATE rooms SET status = 'INACTIVE' WHERE status = 'LIVE' AND room_id NOT IN (SELECT DISTINCT room_id FROM room_seats WHERE status != 'EMPTY')");
    res.json({ success: true, message: 'تم إجراء عمليات التنظيف والصيانة بنجاح' });
});

module.exports = router;
