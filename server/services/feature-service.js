'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const DB_PATH =
    process.env.LEXBRIDGE_DB_PATH ||
    path.join(__dirname, '..', '..', 'data', 'lexbridge.sqlite');

function sqlEscape(value) {
    return String(value ?? '').replace(/'/g, "''");
}

function read(sql) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, sql],
        { encoding: 'utf8' }
    ).trim();

    return output ? JSON.parse(output) : [];
}

function write(sql) {
    execFileSync(
        'sqlite3',
        [DB_PATH, sql],
        { encoding: 'utf8' }
    );
}

const FEATURE_CATALOG = [
    {
        key: 'profile-badge',
        title: 'شارة الملف الشخصي',
        description: 'إظهار شارة مميزة بجوار اسم الحساب.',
        category: 'profile',
        icon: '🏅',
        level: 1,
        membership: 'FREE',
        order: 10
    },
    {
        key: 'profile-frame',
        title: 'إطار الملف الشخصي',
        description: 'اختيار إطار مميز حول صورة الملف الشخصي.',
        category: 'profile',
        icon: '🖼️',
        level: 1,
        membership: 'FREE',
        order: 20
    },
    {
        key: 'vip-badge',
        title: 'شارة VIP',
        description: 'شارة عضوية VIP للحساب.',
        category: 'membership',
        icon: '👑',
        level: 1,
        membership: 'VIP',
        order: 30
    },
    {
        key: 'svip-power',
        title: 'SVIP POWER',
        description: 'امتيازات متقدمة للحساب وغرف البث.',
        category: 'membership',
        icon: '⚡',
        level: 1,
        membership: 'SVIP',
        order: 40
    },
    {
        key: 'room-entry-effect',
        title: 'تأثير دخول الغرفة',
        description: 'تأثير مميز عند دخول الغرف.',
        category: 'room',
        icon: '✨',
        level: 2,
        membership: 'VIP',
        order: 50
    },
    {
        key: 'room-special-seat',
        title: 'مقعد مميز',
        description: 'إمكانية الاستفادة من امتيازات المقعد داخل الغرفة.',
        category: 'room',
        icon: '💺',
        level: 2,
        membership: 'VIP',
        order: 60
    },
    {
        key: 'gift-effects',
        title: 'تأثيرات الهدايا',
        description: 'امتيازات وتأثيرات خاصة مرتبطة بالهدايا.',
        category: 'gifts',
        icon: '🎁',
        level: 3,
        membership: 'VIP',
        order: 70
    },
    {
        key: 'wallet-priority',
        title: 'امتيازات المحفظة',
        description: 'امتيازات إضافية مرتبطة بخدمات المحفظة.',
        category: 'wallet',
        icon: '💰',
        level: 3,
        membership: 'SVIP',
        order: 80
    },
    {
        key: 'exclusive-room-tools',
        title: 'أدوات الغرفة الحصرية',
        description: 'أدوات متقدمة لإدارة الغرفة.',
        category: 'room',
        icon: '🎙️',
        level: 4,
        membership: 'SVIP',
        order: 90
    }
];

function ensureCatalog() {
    for (const item of FEATURE_CATALOG) {
        const featureId = `feature-${item.key}`;

        write(`
            INSERT INTO feature_catalog (
                feature_id,
                feature_key,
                title,
                description,
                category,
                icon,
                required_level,
                required_membership,
                enabled,
                sort_order
            )
            VALUES (
                '${sqlEscape(featureId)}',
                '${sqlEscape(item.key)}',
                '${sqlEscape(item.title)}',
                '${sqlEscape(item.description)}',
                '${sqlEscape(item.category)}',
                '${sqlEscape(item.icon)}',
                ${Number(item.level)},
                '${sqlEscape(item.membership)}',
                1,
                ${Number(item.order)}
            )
            ON CONFLICT(feature_key) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                category = excluded.category,
                icon = excluded.icon,
                required_level = excluded.required_level,
                required_membership = excluded.required_membership,
                enabled = excluded.enabled,
                sort_order = excluded.sort_order,
                updated_at = CURRENT_TIMESTAMP;
        `);
    }
}

function ensureUser(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم مطلوب');
    }

    const membershipId = `membership-${userId}`;

    write(`
        INSERT INTO user_memberships (
            membership_id,
            user_id,
            membership_type,
            level,
            points
        )
        VALUES (
            '${sqlEscape(membershipId)}',
            '${sqlEscape(userId)}',
            'FREE',
            1,
            0
        )
        ON CONFLICT(user_id) DO NOTHING;
    `);

    const catalog = read(`
        SELECT feature_id
        FROM feature_catalog
        WHERE enabled = 1
        ORDER BY sort_order ASC;
    `);

    for (const feature of catalog) {
        const id = crypto.randomUUID();

        write(`
            INSERT INTO user_features (
                user_feature_id,
                user_id,
                feature_id,
                status,
                metadata
            )
            VALUES (
                '${sqlEscape(id)}',
                '${sqlEscape(userId)}',
                '${sqlEscape(feature.feature_id)}',
                'LOCKED',
                '{}'
            )
            ON CONFLICT(user_id, feature_id) DO NOTHING;
        `);
    }
}

function membershipRank(type) {
    return {
        FREE: 0,
        VIP: 1,
        SVIP: 2
    }[String(type || 'FREE').toUpperCase()] ?? 0;
}

function getMembership(userId) {
    ensureUser(userId);

    const rows = read(`
        SELECT
            membership_id,
            user_id,
            membership_type,
            level,
            points,
            started_at,
            expires_at,
            created_at,
            updated_at
        FROM user_memberships
        WHERE user_id = '${sqlEscape(userId)}'
        LIMIT 1;
    `);

    return rows[0] || null;
}

function calculateStatus(feature, membership) {
    if (!feature.enabled) {
        return 'DISABLED';
    }

    const currentMembership =
        String(membership.membership_type || 'FREE').toUpperCase();

    const requiredMembership =
        String(feature.required_membership || 'FREE').toUpperCase();

    const membershipOK =
        membershipRank(currentMembership) >=
        membershipRank(requiredMembership);

    const levelOK =
        Number(membership.level || 1) >=
        Number(feature.required_level || 1);

    return membershipOK && levelOK ? 'AVAILABLE' : 'LOCKED';
}

function getFeatures(userId) {
    ensureUser(userId);

    const membership = getMembership(userId);

    const rows = read(`
        SELECT
            f.feature_id,
            f.feature_key,
            f.title,
            f.description,
            f.category,
            f.icon,
            f.required_level,
            f.required_membership,
            f.enabled,
            f.sort_order,
            uf.status AS stored_status,
            uf.activated_at,
            uf.expires_at,
            uf.metadata
        FROM feature_catalog f
        LEFT JOIN user_features uf
            ON uf.feature_id = f.feature_id
            AND uf.user_id = '${sqlEscape(userId)}'
        WHERE f.enabled = 1
        ORDER BY f.sort_order ASC;
    `);

    return {
        membership,
        features: rows.map(feature => ({
            featureId: feature.feature_id,
            key: feature.feature_key,
            title: feature.title,
            description: feature.description,
            category: feature.category,
            icon: feature.icon,
            requiredLevel: Number(feature.required_level),
            requiredMembership: feature.required_membership,
            enabled: Boolean(feature.enabled),
            status: calculateStatus(feature, membership),
            storedStatus: feature.stored_status || 'LOCKED',
            activatedAt: feature.activated_at || null,
            expiresAt: feature.expires_at || null
        }))
    };
}

function activateFeature(userId, featureKey) {
    if (!featureKey) {
        throw new Error('مفتاح الميزة مطلوب');
    }

    ensureUser(userId);

    const membership = getMembership(userId);

    const features = read(`
        SELECT *
        FROM feature_catalog
        WHERE feature_key = '${sqlEscape(featureKey)}'
          AND enabled = 1
        LIMIT 1;
    `);

    const feature = features[0];

    if (!feature) {
        const error = new Error('الميزة غير موجودة');
        error.code = 'FEATURE_NOT_FOUND';
        throw error;
    }

    const status = calculateStatus(feature, membership);

    if (status !== 'AVAILABLE') {
        const error = new Error('الميزة غير متاحة لهذا الحساب');
        error.code = 'FEATURE_LOCKED';
        throw error;
    }

    write(`
        UPDATE user_features
        SET
            status = 'ACTIVE',
            activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = '${sqlEscape(userId)}'
          AND feature_id = '${sqlEscape(feature.feature_id)}';
    `);

    return getFeatures(userId);
}

module.exports = {
    FEATURE_CATALOG,
    ensureCatalog,
    ensureUser,
    getMembership,
    getFeatures,
    activateFeature
};
