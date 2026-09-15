#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
DB="$PROJECT/data/lexbridge.sqlite"

cd "$PROJECT"

echo "========================================"
echo "       فحص نظام المقاعد"
echo "========================================"

if [ ! -f "$DB" ]; then
    echo "❌ قاعدة البيانات غير موجودة:"
    echo "$DB"
    exit 1
fi

echo
echo "===== 1) جدول المقاعد ====="
sqlite3 "$DB" "
SELECT
    COUNT(*) AS total_seats,
    SUM(CASE WHEN status='EMPTY' THEN 1 ELSE 0 END) AS empty_seats,
    SUM(CASE WHEN status='OCCUPIED' THEN 1 ELSE 0 END) AS occupied_seats
FROM room_seats;
"

echo
echo "===== 2) المقاعد الموجودة فعليًا ====="
sqlite3 -header -column "$DB" "
SELECT
    room_id,
    seat_number,
    status,
    COALESCE(user_id,'-') AS user_id,
    mic_enabled,
    camera_enabled
FROM room_seats
ORDER BY room_id, seat_number
LIMIT 100;
"

echo
echo "===== 3) عدد المقاعد لكل غرفة ====="
sqlite3 -header -column "$DB" "
SELECT
    room_id,
    COUNT(*) AS seats,
    SUM(CASE WHEN status='EMPTY' THEN 1 ELSE 0 END) AS empty,
    SUM(CASE WHEN status='OCCUPIED' THEN 1 ELSE 0 END) AS occupied
FROM room_seats
GROUP BY room_id
ORDER BY room_id;
"

echo
echo "===== 4) تعريف الجدول ====="
sqlite3 "$DB" ".schema room_seats"

echo
echo "========================================"
echo "        انتهى فحص المقاعد"
echo "========================================"
