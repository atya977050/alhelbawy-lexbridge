#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
FILE="$PROJECT/public/index.html"

die() {
    echo "❌ $1"
    exit 1
}

cd "$PROJECT"
[ -f "$FILE" ] || die "public/index.html غير موجود"

echo "========================================"
echo "   ربط المحفظة داخل شاشة أنا"
echo "========================================"

python - <<'PY'
from pathlib import Path

p = Path("public/index.html")
s = p.read_text(encoding="utf-8")

# ------------------------------------------------------------
# 1) استبدال واجهة المحفظة التجريبية بواجهة حقيقية
# ------------------------------------------------------------

old = """💰 المحفظة — واجهة المحفظة جاهزة، وسيتم عرض الرصيد والمعاملات عند توفر مسار المحفظة."""

if old not in s:
    raise SystemExit("لم يتم العثور على نص واجهة المحفظة التجريبية")

new = r"""
<div class="me-wallet-panel" id="meWalletPanel">
    <div class="me-wallet-head">
        <div>
            <div class="me-wallet-title">💰 المحفظة</div>
            <div class="me-wallet-subtitle">رصيدك وحركة معاملاتك</div>
        </div>

        <button
            type="button"
            id="refreshWalletBtn"
            class="me-wallet-refresh"
            onclick="loadMeWallet()"
        >↻ تحديث</button>
    </div>

    <div class="me-wallet-balance">
        <div class="me-wallet-label">الرصيد المتاح</div>
        <div class="me-wallet-amount">
            <span id="meWalletBalance">0.00</span>
            <span class="me-wallet-currency">جنيه</span>
        </div>
    </div>

    <div class="me-wallet-stats">
        <div class="me-wallet-stat">
            <span>المتاح</span>
            <strong id="meWalletAvailable">0.00 جنيه</strong>
        </div>

        <div class="me-wallet-stat">
            <span>محجوز</span>
            <strong id="meWalletReserved">0.00 جنيه</strong>
        </div>
    </div>

    <div class="me-wallet-transactions-head">
        <strong>آخر المعاملات</strong>
        <span id="meWalletTransactionCount">0</span>
    </div>

    <div id="meWalletTransactions" class="me-wallet-transactions">
        <div class="me-wallet-empty">جارٍ تحميل المعاملات...</div>
    </div>

    <div id="meWalletStatus" class="me-wallet-status"></div>
</div>
"""

s = s.replace(old, new, 1)

# ------------------------------------------------------------
# 2) إضافة CSS
# ------------------------------------------------------------

style_marker = '<style id="me-center-style">'

if style_marker not in s:
    raise SystemExit("لم يتم العثور على me-center-style")

wallet_css = r"""
<style id="me-wallet-style">
.me-wallet-panel {
    margin-top: 14px;
    padding: 16px;
    border-radius: 18px;
    background: rgba(255,255,255,.055);
    border: 1px solid rgba(212,175,55,.25);
    direction: rtl;
}

.me-wallet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.me-wallet-title {
    font-size: 18px;
    font-weight: 800;
}

.me-wallet-subtitle {
    margin-top: 3px;
    opacity: .65;
    font-size: 12px;
}

.me-wallet-refresh {
    border: 1px solid rgba(212,175,55,.35);
    background: rgba(212,175,55,.10);
    color: inherit;
    border-radius: 12px;
    padding: 7px 11px;
    cursor: pointer;
}

.me-wallet-balance {
    margin-top: 15px;
    padding: 16px;
    border-radius: 16px;
    background: rgba(212,175,55,.09);
    border: 1px solid rgba(212,175,55,.20);
    text-align: center;
}

.me-wallet-label {
    font-size: 12px;
    opacity: .7;
}

.me-wallet-amount {
    margin-top: 5px;
    font-size: 30px;
    font-weight: 900;
}

.me-wallet-currency {
    font-size: 14px;
    font-weight: 600;
    opacity: .75;
}

.me-wallet-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
}

.me-wallet-stat {
    padding: 11px;
    border-radius: 13px;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.07);
}

.me-wallet-stat span {
    display: block;
    font-size: 11px;
    opacity: .65;
}

.me-wallet-stat strong {
    display: block;
    margin-top: 5px;
    font-size: 14px;
}

.me-wallet-transactions-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 18px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,.08);
}

.me-wallet-transactions-head span {
    min-width: 24px;
    text-align: center;
    padding: 2px 7px;
    border-radius: 10px;
    background: rgba(255,255,255,.08);
    font-size: 11px;
}

.me-wallet-transactions {
    margin-top: 7px;
}

.me-wallet-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 11px 3px;
    border-bottom: 1px solid rgba(255,255,255,.055);
}

.me-wallet-row-main {
    min-width: 0;
}

.me-wallet-row-title {
    font-size: 13px;
    font-weight: 700;
}

.me-wallet-row-date {
    margin-top: 3px;
    font-size: 10px;
    opacity: .55;
}

.me-wallet-credit {
    color: #35c978;
}

.me-wallet-debit {
    color: #ff6b6b;
}

.me-wallet-row-amount {
    white-space: nowrap;
    font-size: 13px;
    font-weight: 800;
}

.me-wallet-empty {
    padding: 18px 8px;
    text-align: center;
    opacity: .6;
    font-size: 12px;
}

.me-wallet-status {
    min-height: 18px;
    margin-top: 8px;
    text-align: center;
    font-size: 11px;
    opacity: .7;
}
</style>
"""

s = s.replace(style_marker, wallet_css + "\n" + style_marker, 1)

# ------------------------------------------------------------
# 3) إضافة JavaScript قبل نهاية Me Center
# ------------------------------------------------------------

marker = "window.ME_CENTER_READY = true;"

if marker not in s:
    raise SystemExit("لم يتم العثور على ME_CENTER_READY")

wallet_js = r"""
/* ============================================================
   ME CENTER - WALLET
   ============================================================ */

(function () {
    function walletEscape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function walletMoney(minor) {
        const value = Number(minor || 0) / 100;
        return value.toLocaleString('ar-EG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function walletDate(value) {
        if (!value) return '';

        const date = new Date(
            String(value).replace(' ', 'T') + 'Z'
        );

        if (Number.isNaN(date.getTime())) {
            return walletEscape(value);
        }

        return date.toLocaleString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function walletDescription(tx) {
        if (tx.description) {
            return tx.description;
        }

        if (tx.direction === 'credit') {
            return 'إضافة إلى المحفظة';
        }

        if (tx.direction === 'debit') {
            return 'خصم من المحفظة';
        }

        return tx.type || 'معاملة';
    }

    function renderMeWallet(data) {
        const wallet = data && data.wallet ? data.wallet : {};
        const transactions = Array.isArray(data && data.transactions)
            ? data.transactions
            : [];

        const available = Number(wallet.available_minor || 0);
        const reserved = Number(wallet.reserved_minor || 0);

        const balanceEl = document.getElementById('meWalletBalance');
        const availableEl = document.getElementById('meWalletAvailable');
        const reservedEl = document.getElementById('meWalletReserved');
        const countEl = document.getElementById('meWalletTransactionCount');
        const listEl = document.getElementById('meWalletTransactions');

        if (balanceEl) {
            balanceEl.textContent = walletMoney(available);
        }

        if (availableEl) {
            availableEl.textContent = walletMoney(available) + ' جنيه';
        }

        if (reservedEl) {
            reservedEl.textContent = walletMoney(reserved) + ' جنيه';
        }

        if (countEl) {
            countEl.textContent = String(transactions.length);
        }

        if (!listEl) return;

        if (!transactions.length) {
            listEl.innerHTML =
                '<div class="me-wallet-empty">لا توجد معاملات حتى الآن</div>';
            return;
        }

        listEl.innerHTML = transactions.map(function (tx) {
            const isCredit = tx.direction === 'credit';
            const sign = isCredit ? '+' : '-';
            const cls = isCredit
                ? 'me-wallet-credit'
                : 'me-wallet-debit';

            return `
                <div class="me-wallet-row">
                    <div class="me-wallet-row-main">
                        <div class="me-wallet-row-title">
                            ${walletEscape(walletDescription(tx))}
                        </div>
                        <div class="me-wallet-row-date">
                            ${walletDate(tx.created_at)}
                        </div>
                    </div>

                    <div class="me-wallet-row-amount ${cls}">
                        ${sign}${walletMoney(tx.amount_minor)} جنيه
                    </div>
                </div>
            `;
        }).join('');
    }

    window.loadMeWallet = async function () {
        const status = document.getElementById('meWalletStatus');
        const button = document.getElementById('refreshWalletBtn');

        try {
            if (status) {
                status.textContent = 'جارٍ تحديث المحفظة...';
            }

            if (button) {
                button.disabled = true;
            }

            const response = await fetch('/api/wallet', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    ...(typeof token !== 'undefined' && token
                        ? { 'Authorization': 'Bearer ' + token }
                        : {})
                }
            });

            const result = await response.json().catch(function () {
                return {};
            });

            if (!response.ok || !result.ok) {
                throw new Error(
                    result.message ||
                    result.error ||
                    'تعذر تحميل المحفظة'
                );
            }

            renderMeWallet(result.data || {});

            if (status) {
                status.textContent = 'تم تحديث المحفظة';
            }
        } catch (error) {
            console.error('ME_WALLET_LOAD_ERROR', error);

            if (status) {
                status.textContent =
                    error.message || 'تعذر تحميل المحفظة';
            }
        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    };

    window.ME_WALLET_READY = true;
})();
"""

s = s.replace(marker, wallet_js + "\n" + marker, 1)

# ------------------------------------------------------------
# 4) تشغيل تحميل المحفظة تلقائيًا عند فتح مركز أنا
# ------------------------------------------------------------

open_marker = "window.openMeCenter ="

if open_marker not in s:
    raise SystemExit("لم يتم العثور على openMeCenter")

# لا نعدل جسم الدالة بشكل هش.
# نضيف hook عام بعد جاهزية المركز.
hook_marker = "window.ME_CENTER_READY = true;"

hook = r"""
setTimeout(function () {
    if (typeof window.loadMeWallet === 'function') {
        window.loadMeWallet();
    }
}, 0);
"""

s = s.replace(hook_marker, hook + "\n" + hook_marker, 1)

p.write_text(s, encoding="utf-8")
print("ME_WALLET_UI_INSTALLED")
PY

echo
echo "===== HTML CHECK ====="

grep -n 'meWalletPanel' public/index.html | head -n 3
grep -n 'loadMeWallet' public/index.html | head -n 5
grep -n 'ME_WALLET_READY' public/index.html | head -n 3

echo
echo "===== JAVASCRIPT CHECK ====="

node - <<'NODE'
const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const required = [
    'meWalletPanel',
    'meWalletBalance',
    'meWalletTransactions',
    '/api/wallet',
    'loadMeWallet',
    'ME_WALLET_READY'
];

for (const item of required) {
    if (!html.includes(item)) {
        throw new Error('MARKER_MISSING: ' + item);
    }
}

const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1])
    .filter(Boolean);

for (let i = 0; i < scripts.length; i++) {
    const file = `.__wallet_check_${i}.js`;
    fs.writeFileSync(file, scripts[i], 'utf8');

    const cp = require('child_process').spawnSync(
        process.execPath,
        ['--check', file],
        { encoding: 'utf8' }
    );

    fs.unlinkSync(file);

    if (cp.status !== 0) {
        console.error(cp.stderr || cp.stdout);
        throw new Error('HTML_SCRIPT_SYNTAX_ERROR #' + i);
    }
}

console.log('ME_WALLET_HTML_JS_OK');
NODE

echo
echo "===== SERVER CHECK ====="

node --check server.js
echo "SERVER_JS_OK"

echo
echo "===== WALLET ROUTE CHECK ====="

node - <<'NODE'
const route = require('./server/routes/wallet');
if (!route) {
    throw new Error('Wallet route لم يتم تحميله');
}
console.log('WALLET_ROUTE_LOAD_OK');
NODE

echo
echo "===== DIFF CHECK ====="

git diff --check

echo
echo "========================================"
echo "✅ WALLET UI LINKED TO «أنا»"
echo "========================================"
