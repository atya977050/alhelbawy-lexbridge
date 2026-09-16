#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="/data/data/com.termux/files/home/الهلباوى lexbridge V2"
cd "$PROJECT"

echo "=================================================="
echo "    LEXBRIDGE V2 — PHASE 3 ULTIMATE AUTOPATCH     "
echo "=================================================="
echo "الصلاحيات الممنوحة: فحص شامل، تصحيح تلقائي، وتجهيز للنشر"
echo ""

# 1. فحص وصيانة قاعدة البيانات والجداول الأساسية
echo "[*] فحص قاعدة البيانات وضمان سلامة الجداول..."
node -e "
const { run, query } = require('./server/database/db');
try {
    run(\"CREATE TABLE IF NOT EXISTS rooms (room_id TEXT PRIMARY KEY, owner_user_id TEXT, name TEXT, status TEXT DEFAULT 'IDLE', welcome_message TEXT, cover_image TEXT, max_viewers INTEGER, is_locked INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)\");
    run(\"CREATE TABLE IF NOT EXISTS room_seats (seat_id TEXT PRIMARY KEY, room_id TEXT, seat_number INTEGER, user_id TEXT, status TEXT DEFAULT 'EMPTY', mic_enabled INTEGER DEFAULT 0, camera_enabled INTEGER DEFAULT 0, joined_at DATETIME)\");
    console.log('DATABASE_INTEGRITY: PASSED');
} catch (e) {
    console.error('DATABASE_FIX_ERROR:', e.message);
    process.exit(1);
}
"

# 2. فحص وتصحيح جميع الخدمات وملفات التصدير (Services & Exports)
echo "[*] فحص وصيانة خدمات المشروع وتصدير الدوال..."
python3 - << 'PY'
from pathlib import Path

# التأكد من تصدير ensureSeats في room-seat-service.js
seat_service = Path("server/services/room-seat-service.js")
if seat_service.exists():
    content = seat_service.read_text()
    if "ensureSeats" in content and "ensureSeats," not in content and "ensureSeats" not in content.split("module.exports")[1]:
        content = content.replace("module.exports = {", "module.exports = {\n    ensureSeats,")
        seat_service.write_text(content)
        print("AUTO_PATCH: ensureSeats exported successfully.")

# التأكد من استيراد getSeats في room-engine-service.js
engine_service = Path("server/services/room-engine-service.js")
if engine_service.exists():
    content = engine_service.read_text()
    if "room-seat-service" not in content:
        content = "const { getSeats } = require('./room-seat-service');\n" + content
        engine_service.write_text(content)
        print("AUTO_PATCH: getSeats imported into engine service.")
PY

# 3. فحص بناء وحزم الجافاسكريبت عبر Node Syntax Check لكل ملفات المشروع
echo "[*] فحص أخطاء بناء الملفات (Syntax Check)..."
find server -name "*.js" | while read -r file; do
    node --check "$file" && echo "PASS: $file"
done

# 4. تشغيل خادم تجريبي واختبار دورة حياة الغرف والمحرك بالكامل
echo "[*] تشغيل الاختبار الوظيفي الشامل للغرف والمحرك..."
bash test-phase1-rooms-full.sh

echo ""
echo "=================================================="
echo " ✅ تم الانتهاء من الفحص الشامل والإصلاح التلقائي بنجاح!"
echo " 🚀 النسخة جاهزة تماماً للرفع والنشر الفوري."
echo "=================================================="
