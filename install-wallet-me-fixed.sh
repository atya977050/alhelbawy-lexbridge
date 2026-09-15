#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

PROJECT="$HOME/الهلباوى lexbridge"
INDEX="$PROJECT/public/index.html"

die() {
    echo "❌ $1"
    exit 1
}

trap 'echo "❌ فشل عند السطر: $LINENO"' ERR

cd "$PROJECT"

[ -f "$INDEX" ] || die "public/index.html غير موجود"

echo "========================================"
echo "   إصلاح وربط المحفظة داخل أنا"
echo "========================================"

python - "$INDEX" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

# -------------------------------------------------
# 1) تحديث وصف المحفظة الحقيقي الموجود في الملف
# -------------------------------------------------
old = """                '💰 المحفظة',
                'واجهة المحفظة جاهزة، وسيتم عرض الرصيد والمعاملات عند توفر مسار المحفظة.'"""

new = """                '💰 المحفظة',
                'عرض الرصيد والمعاملات والمحفظة الحقيقية.'"""

if old in s:
    s = s.replace(old, new, 1)
    print("WALLET_DESCRIPTION_UPDATED")
else:
    print("WALLET_DESCRIPTION_ALREADY_UPDATED_OR_DIFFERENT")

# -------------------------------------------------
# 2) CSS
# -------------------------------------------------
css_marker = "/* WALLET_ME_CENTER_STYLE */"

if css_marker not in s:
    css = r'''
/* WALLET_ME_CENTER_STYLE */
.wallet-me-panel {
    margin-top: 14px;
    padding: 14px;
    border-radius: 18px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(212,175,55,.25);
}

.wallet-me-balance {
    text-align: center;
    padding: 14px 10px;
    margin-bottom: 12px;
    border-radius: 16px;
    background: rgba(212,175,55,.10);
}

.wallet-me-balance-label {
    font-size: 13px;
    opacity: .75;
}

.wallet-me-balance-value {
    margin-top: 5px;
    font-size: 30px;
    font-weight: 800;
}

.wallet-me-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    opacity: .8;
    margin-top: 6px;
}

.wallet-me-transactions {
    margin-top: 12px;
}

.wallet-me-transaction {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,.08);
}

.wallet-me-transaction:last-child {
    border-bottom: 0;
}

.wallet-me-transaction-type {
    font-weight: 700;
}

.wallet-me-transaction-info {
    font-size: 11px;
    opacity: .65;
    margin-top: 3px;
}

.wallet-me-credit {
    color: #35d07f;
    font-weight: 800;
}

.wallet-me-debit {
    color: #ff7777;
    font-weight: 800;
}

.wallet-me-empty {
    text-align: center;
    opacity: .6;
    padding: 14px;
}

.wallet-me-error {
    text-align: center;
    color: #ff7777;
    padding: 12px;
}
'''

    pos = s.lower().find("</style>")

    if pos == -1:
        raise SystemExit("لم يتم العثور على </style>")

    s = s[:pos] + css + "\n" + s[pos:]
    print("WALLET_CSS_ADDED")
else:
    print("WALLET_CSS_ALREADY_PRESENT")

# -------------------------------------------------
# 3) JavaScript المحفظة
# -------------------------------------------------
js_marker = "/* WALLET_ME_CENTER_JS */"

if js_marker not in s:
    js = r'''
<script>
/* WALLET_ME_CENTER_JS */
(function () {
    'use strict';

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
        return value.toFixed(2) + ' EGP';
    }

    function walletDate(value) {
        if (!value) return '';

        const d = new Date(value);

        if (Number.isNaN(d.getTime())) {
            return walletEscape(value);
        }

        return d.toLocaleString('ar-EG');
    }

    function walletApiToken() {
        return (
            window.authToken ||
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('accessToken') ||
            ''
        );
    }

    async function loadRealWallet() {
        const panel = document.getElementById('realWalletPanel');

        if (!panel) {
            console.warn('REAL_WALLET_PANEL_NOT_FOUND');
            return;
        }

        panel.innerHTML =
            '<div class="wallet-me-empty">جاري تحميل المحفظة...</div>';

        try {
            const token = walletApiToken();

            const headers = {
                'Accept': 'application/json'
            };

            if (token) {
                headers.Authorization = 'Bearer ' + token;
            }

            const response = await fetch('/api/wallet', {
                method: 'GET',
                headers,
                credentials: 'same-origin'
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.ok) {
                throw new Error(
                    result.message ||
                    result.error ||
                    'تعذر تحميل المحفظة'
                );
            }

            const data = result.data || {};
            const wallet = data.wallet || {};

            const transactions = Array.isArray(data.transactions)
                ? data.transactions
                : [];

            const available = Number(
                wallet.available_minor || 0
            );

            const reserved = Number(
                wallet.reserved_minor || 0
            );

            const transactionHtml = transactions.length
                ? transactions.map(function (tx) {
                    const credit = tx.direction === 'credit';

                    const sign = credit ? '+' : '-';

                    const cls = credit
                        ? 'wallet-me-credit'
                        : 'wallet-me-debit';

                    return `
                        <div class="wallet-me-transaction">
                            <div>
                                <div class="wallet-me-transaction-type">
                                    ${walletEscape(
                                        tx.description ||
                                        (
                                            credit
                                                ? 'إضافة رصيد'
                                                : 'خصم من الرصيد'
                                        )
                                    )}
                                </div>

                                <div class="wallet-me-transaction-info">
                                    ${walletDate(tx.created_at)}
                                </div>
                            </div>

                            <div class="${cls}">
                                ${sign}${walletMoney(tx.amount_minor)}
                            </div>
                        </div>
                    `;
                }).join('')
                : '<div class="wallet-me-empty">لا توجد معاملات حتى الآن</div>';

            panel.innerHTML = `
                <div class="wallet-me-balance">

                    <div class="wallet-me-balance-label">
                        الرصيد المتاح
                    </div>

                    <div class="wallet-me-balance-value">
                        ${walletMoney(available)}
                    </div>

                    <div class="wallet-me-meta">
                        <span>المحجوز</span>
                        <span>${walletMoney(reserved)}</span>
                    </div>

                </div>

                <div class="wallet-me-transactions">
                    ${transactionHtml}
                </div>
            `;
        } catch (error) {
            console.error('WALLET_LOAD_ERROR', error);

            panel.innerHTML = `
                <div class="wallet-me-error">
                    ${walletEscape(
                        error.message || 'تعذر تحميل المحفظة'
                    )}
                </div>
            `;
        }
    }

    function openWalletFromMe() {
        let panel = document.getElementById('realWalletPanel');

        const meCenter = document.getElementById('meCenter');

        if (!meCenter) {
            console.warn('ME_CENTER_NOT_FOUND');
            return;
        }

        if (!panel) {
            panel = document.createElement('div');

            panel.id = 'realWalletPanel';
            panel.className = 'wallet-me-panel';

            meCenter.appendChild(panel);
        }

        loadRealWallet();

        panel.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    window.loadRealWallet = loadRealWallet;
    window.openWalletFromMe = openWalletFromMe;

    window.WALLET_ME_CENTER_READY = true;
})();
</script>
'''

    pos = s.lower().rfind("</body>")

    if pos == -1:
        raise SystemExit("لم يتم العثور على </body>")

    s = s[:pos] + js + "\n" + s[pos:]

    print("WALLET_JS_ADDED")
else:
    print("WALLET_JS_ALREADY_PRESENT")

# -------------------------------------------------
# 4) ربط زر المحفظة بطريقة آمنة
# -------------------------------------------------
if "onclick=\"openWalletFromMe(); return false;\"" not in s:
    target = 'data-me-action="wallet"'

    pos = s.find(target)

    if pos == -1:
        raise SystemExit("لم يتم العثور على زر المحفظة data-me-action=wallet")

    tag_start = s.rfind("<", 0, pos)
    tag_end = s.find(">", pos)

    if tag_start == -1 or tag_end == -1:
        raise SystemExit("تعذر تحديد عنصر زر المحفظة")

    tag = s[tag_start:tag_end + 1]

    if "onclick=" not in tag:
        new_tag = tag[:-1] + ' onclick="openWalletFromMe(); return false;">'
        s = s[:tag_start] + new_tag + s[tag_end + 1:]
        print("WALLET_BUTTON_LINKED")
    else:
        print("WALLET_BUTTON_ALREADY_HAS_ONCLICK")
else:
    print("WALLET_BUTTON_ALREADY_LINKED")

p.write_text(s, encoding="utf-8")

print("WALLET_ME_UI_APPLIED")
PY

echo
echo "===== VERIFY MARKERS ====="

grep -n -E \
"WALLET_ME_CENTER_STYLE|WALLET_ME_CENTER_JS|WALLET_ME_CENTER_READY|openWalletFromMe|realWalletPanel" \
public/index.html | head -n 60

echo
echo "===== VERIFY WALLET BACKEND ====="

node --check server/services/wallet-service.js
node --check server/routes/wallet.js

echo
echo "===== VERIFY SERVER ====="

node --check server.js

echo
echo "===== VERIFY INLINE JAVASCRIPT ====="

python - <<'PY'
from pathlib import Path
import re

p = Path("public/index.html")
s = p.read_text(encoding="utf-8")

scripts = re.findall(
    r"<script\b[^>]*>(.*?)</script>",
    s,
    re.I | re.S
)

Path(".wallet-index-check.js").write_text(
    "\n\n".join(scripts),
    encoding="utf-8"
)

print("INLINE_SCRIPTS_EXTRACTED=" + str(len(scripts)))
PY

node --check .wallet-index-check.js
rm -f .wallet-index-check.js

echo
echo "===== DIFF CHECK ====="

git diff --check

echo
echo "===== FINAL WALLET CHECK ====="

grep -n 'data-me-action="wallet"' public/index.html | head -n 5
grep -n "openWalletFromMe" public/index.html | head -n 10

echo
echo "========================================"
echo "✅ WALLET ME CENTER INSTALLED"
echo "========================================"
echo "API: /api/wallet"
echo "UI: شاشة أنا"
echo "الرصيد: available_minor"
echo "المحجوز: reserved_minor"
echo "المعاملات: wallet_transactions"
echo
echo "🚫 لا GitHub"
echo "🚫 لا Railway"
echo "🚫 لا WebRTC"
echo "========================================"

rm -f install-wallet-me-fixed.sh
