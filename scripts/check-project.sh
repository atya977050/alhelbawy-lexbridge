#!/data/data/com.termux/files/usr/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "===== PROJECT ====="
pwd

echo
echo "===== NODE ====="
node --version

echo
echo "===== NPM ====="
npm --version

echo
echo "===== SQLITE ====="
sqlite3 --version

echo
echo "===== SERVER CHECK ====="
node --check server.js

echo
echo "===== DATABASE INIT ====="
node server/database/init.js

echo
echo "===== DATABASE COUNTS ====="

sqlite3 data/lexbridge.sqlite <<'SQL'
SELECT 'users=' || COUNT(*) FROM users;
SELECT 'rooms=' || COUNT(*) FROM rooms;
SELECT 'wallets=' || COUNT(*) FROM wallets;
SELECT 'sessions=' || COUNT(*) FROM sessions;
SELECT 'friendships=' || COUNT(*) FROM friendships;
SELECT 'follows=' || COUNT(*) FROM follows;
SELECT 'visits=' || COUNT(*) FROM visits;
SQL

echo
echo "===== PROJECT CHECK COMPLETE ====="
