const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 1. صفحة تسجيل الدخول الملكية الفاخرة
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>👑 منصة الهلباوى LexBridge — البوابة الملكية</title>
    <style>
        :root {
            --bg-color: #080b12; --card-bg: #111827; --gold-primary: #d4af37; --gold-light: #f3e5ab; --gold-dark: #aa8c2c; --text-main: #f9fafb; --text-muted: #9ca3af; --border-gold: rgba(212, 175, 55, 0.4); --success: #10b981;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Segoe UI", Tahoma, sans-serif; }
        body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .login-card { background: var(--card-bg); border: 2px solid var(--gold-primary); border-radius: 20px; padding: 28px; width: 100%; max-width: 420px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.7); }
        .brand-title { font-size: 1.5rem; font-weight: bold; color: var(--gold-light); margin-bottom: 8px; }
        .brand-sub { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 22px; }
        .input-group { margin-bottom: 16px; text-align: right; }
        .input-group label { display: block; font-size: 0.85rem; color: var(--gold-light); margin-bottom: 6px; font-weight: bold; }
        .input-group input, .input-group select { width: 100%; padding: 12px; background: #1f2937; border: 1px solid var(--border-gold); border-radius: 10px; color: #fff; font-size: 1rem; outline: none; }
        .btn-gold { background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary)); color: #000; border: none; padding: 12px; width: 100%; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 1.05rem; margin-top: 10px; box-shadow: 0 4px 12px rgba(212,175,55,0.3); }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="brand-title">👑 LexBridge V2</div>
        <div class="brand-sub">منصة البث المباشر والإدارة القانونية الملكية</div>
        <form action="/platform" method="GET">
            <div class="input-group">
                <label>اسم المستخدم / المشرف</label>
                <input type="text" name="username" value="عطيه (المشرف العام)" required>
            </div>
            <div class="input-group">
                <label>رتبة الدخول</label>
                <select name="role">
                    <option value="host">🎙️ مشرف رئيسي (تحكم كامل بالمايك والكاميرا)</option>
                    <option value="viewer">👑 عضو VIP / مشاهد ومبثوث</option>
                </select>
            </div>
            <button type="submit" class="btn-gold">🚀 دخول المنصة الملكية</button>
        </form>
    </div>
</body>
</html>`);
});

// 2. المنصة الشاملة بكافة القوائم والتبويبات
app.get('/platform', (req, res) => {
    const username = req.query.username || 'عطيه';
    const role = req.query.role || 'host';
    const activeTab = req.query.tab || 'rooms';

    res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>👑 منصة الهلباوى الشاملة — ${username}</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        :root {
            --bg-color: #080b12; --card-bg: #111827; --gold-primary: #d4af37; --gold-light: #f3e5ab; --gold-dark: #aa8c2c; --text-main: #f9fafb; --text-muted: #9ca3af; --border-gold: rgba(212, 175, 55, 0.3); --success: #10b981; --danger: #ef4444; --vip-gold: linear-gradient(135deg, #bf953f, #fc6, #fbf5b7, #b38728);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Segoe UI", Tahoma, sans-serif; }
        body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; padding-bottom: 90px; }
        
        /* الهيدر الملكي */
        .royal-header { background: linear-gradient(135deg, #1a1500, #080b12); border-bottom: 2px solid var(--gold-primary); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }
        .brand-title { font-size: 1.05rem; font-weight: bold; color: var(--gold-light); }
        
        /* شريط الإعلانات المتحرك */
        .marquee-container { background: rgba(212, 175, 55, 0.15); border-bottom: 1px solid var(--border-gold); color: var(--gold-light); font-size: 0.85rem; padding: 6px 0; overflow: hidden; white-space: nowrap; }
        .marquee-container marquee { font-weight: bold; }

        .container { padding: 14px; max-width: 950px; margin: 0 auto; }
        .card { background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 14px; padding: 16px; margin-bottom: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
        
        /* شبكة الغرف المتعددة */
        .rooms-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 10px; }
        .room-box { background: #1f2937; border: 1px solid var(--border-gold); border-radius: 10px; padding: 14px; text-align: center; }
        .room-box h3 { color: var(--gold-light); font-size: 1rem; margin-bottom: 6px; }
        
        /* البث والكاميرا والميكروفون */
        .video-container { width: 100%; background: #000; border-radius: 10px; overflow: hidden; position: relative; aspect-ratio: 16/9; border: 1px solid var(--border-gold); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
        video { width: 100%; height: 100%; object-fit: cover; }
        .video-placeholder { color: var(--text-muted); font-size: 0.85rem; position: absolute; text-align: center; }
        
        /* أزرار التحكم والمايك */
        .control-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .btn-gold { background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary)); color: #000; border: none; padding: 10px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.85rem; text-decoration: none; flex: 1; text-align: center; }
        .btn-danger { background: var(--danger); color: #fff; border: none; padding: 10px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.85rem; flex: 1; text-align: center; }

        /* شات ودردشة */
        .chat-box { height: 150px; background: #080b12; border: 1px solid var(--border-gold); border-radius: 8px; padding: 10px; overflow-y: auto; margin-bottom: 10px; font-size: 0.85rem; }
        .chat-input-group { display: flex; gap: 8px; }
        .chat-input-group input { flex: 1; padding: 10px; background: #1f2937; border: 1px solid var(--border-gold); border-radius: 8px; color: #fff; font-size: 0.9rem; outline: none; }

        /* باقات الشحن والهدايا */
        .packages-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .package-card { background: #1f2937; border: 1px solid var(--border-gold); border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center; }
        .gifts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
        .gift-item { background: #1f2937; border: 1px solid var(--border-gold); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; }

        /* القائمة السفلية الملكية الشاملة */
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #111827; border-top: 2px solid var(--gold-primary); display: flex; justify-content: space-around; padding: 8px 0; z-index: 1000; }
        .nav-item { color: var(--text-muted); font-size: 0.75rem; text-align: center; background: none; border: none; cursor: pointer; flex: 1; padding: 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .nav-item.active { color: var(--gold-primary); font-weight: bold; }
        
        .seats-panel {
            margin-top: 12px;
            background: #111827;
            border: 1px solid var(--border-gold);
            border-radius: 12px;
            padding: 12px;
        }
        .seats-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: var(--gold-light);
            margin-bottom: 10px;
        }
        .seats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
        .seat-card {
            min-height: 72px;
            border: 1px solid #4b5563;
            border-radius: 10px;
            background: #1f2937;
            padding: 8px;
            text-align: center;
        }
        .seat-card.empty {
            border-style: dashed;
            opacity: .85;
        }
        .seat-card.occupied {
            border-color: var(--gold-primary);
        }
        .seat-number {
            font-size: .72rem;
            color: var(--text-muted);
        }
        .seat-user {
            color: var(--gold-light);
            font-weight: bold;
            margin-top: 4px;
            word-break: break-word;
        }
        .seat-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        .seat-actions select,
        .seat-actions button {
            flex: 1;
            min-width: 120px;
        }
        .seat-request-box {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid var(--gold-primary);
            border-radius: 10px;
            background: #1f2937;
        }
        .seat-request {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 8px;
            margin-top: 6px;
            background: #111827;
            border-radius: 8px;
        }

        .section-content { display: none; }
        .section-content.active { display: block; }
    </style>
</head>
<body>
    <header class="royal-header">
        <div class="brand-title">👑 LexBridge V2 (منصة الهلباوي)</div>
        <div style="font-size: 0.8rem; color: var(--success);">👤 ${username}</div>
    </header>

    <!-- شريط الإعلانات المتحرك الملكي -->
    <div class="marquee-container">
        <marquee scrollamount="5">⭐ أهلاً بك يا ${username} في المنصة الملكية المتكاملة للبث والخدمات القانونية | تم تفعيل غرف البث، الهدايا، ورصيد الـ VIP بنجاح ⭐</marquee>
    </div>

    <div class="container">
        
        <!-- 1. تبويب الغرف المتعددة وبث الكاميرا والميكروفون -->
        <div id="sec-rooms" class="section-content ${activeTab === 'rooms' ? 'active' : ''}">
            <div class="card">
                <h2 style="color: var(--gold-light); font-size: 1.05rem; margin-bottom: 8px;">🎙️ غرفة البث المباشر النشطة والمايك</h2>
                
                <div class="video-container">
                    <div id="placeholder" class="video-placeholder">📡 الكاميرا أو الميكروفون في انتظار تفعيل المشرف...</div>
                    <video id="remoteVideo" autoplay playsinline ${role === 'host' ? 'muted' : ''}></video>
                </div>

                <!-- نظام المقاعد -->
                <div class="seats-panel">
                    <div class="seats-title">
                        <strong>💺 مقاعد الغرفة</strong>
                        <span id="seatCount">0/6</span>
                    </div>

                    <div id="seatsGrid" class="seats-grid">
                        <div class="seat-card empty">
                            <div class="seat-number">المقاعد</div>
                            <div class="seat-user">جاري التحميل...</div>
                        </div>
                    </div>

                    <div class="seat-actions">
                        <select id="seatNumber">
                            <option value="">اختر مقعدًا</option>
                            <option value="1">المقعد 1</option>
                            <option value="2">المقعد 2</option>
                            <option value="3">المقعد 3</option>
                            <option value="4">المقعد 4</option>
                            <option value="5">المقعد 5</option>
                            <option value="6">المقعد 6</option>
                        </select>
                        <button class="btn-gold" onclick="requestSeat()">🪑 طلب الجلوس</button>
                        <button class="btn-danger" onclick="leaveSeat()">🚪 مغادرة المقعد</button>
                    </div>

                    ${role === 'host' ? `
                    <div id="seatRequests" class="seat-request-box">
                        <strong style="color:var(--gold-light);">🔔 طلبات الجلوس</strong>
                        <div id="seatRequestsList">
                            <div style="font-size:.8rem;color:var(--text-muted);margin-top:6px;">
                                لا توجد طلبات حالية
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${role === 'host' ? `
                <div class="control-btns">
                    <button class="btn-gold" onclick="startBroadcast()">🟢 تشغيل الكاميرا والميكروفون</button>
                    <button class="btn-danger" onclick="stopBroadcast()">🔴 إيقاف البث</button>
                </div>
                ` : '<div style="text-align:center; font-size:0.85rem; color:var(--success); margin-bottom:8px;">أنت متصل بالغرفة كعضو VIP ومستقبل للبث</div>'}

                <div class="chat-box" id="chatMessages"></div>
                <div class="chat-input-group">
                    <input type="text" id="messageInput" placeholder="اكتب رسالة للغرفة..." onkeypress="if(event.key==='Enter') sendMessage()">
                    <button class="btn-gold" onclick="sendMessage()" style="flex: 0 0 80px;">إرسال</button>
                </div>
            </div>

            <!-- قائمة الغرف الأخرى -->
            <div class="card">
                <h3 style="color: var(--gold-light); font-size: 1rem; margin-bottom: 8px;">🏛️ غرف المنصة المتاحة</h3>
                <div class="rooms-grid">
                    <div class="room-box">
                        <h3>الغرفة العامة القانونية</h3>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">مفتوحة لجميع الأعضاء والمشرفين</p>
                        <button class="btn-gold" style="padding: 6px;" onclick="alert('أنت متصل بالفعل بهذه الغرفة النشطة')">دخول الغرفة</button>
                    </div>
                    <div class="room-box">
                        <h3>غرفة الاستشارات الخاصة</h3>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">مغلقة - تتطلب رتبة VIP</p>
                        <button class="btn-gold" style="padding: 6px; background: #374151; color: var(--gold-light);" onclick="alert('عذراً، هذه الغرفة تتطلب عضوية VIP ذهبية')">دخول مقفل</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. تبويب الرسائل والإشعارات الخاصة -->
        <div id="sec-messages" class="section-content ${activeTab === 'messages' ? 'active' : ''}">
            <div class="card">
                <h2 style="color: var(--gold-light); font-size: 1.05rem; margin-bottom: 12px;">💬 مركز الرسائل والإشعارات</h2>
                <div style="background: #1f2937; border-radius: 8px; padding: 12px; margin-bottom: 10px; border-right: 3px solid var(--gold-primary);">
                    <div style="font-weight: bold; color: var(--gold-light); font-size: 0.9rem;">إدارة منصة الهلباوي</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">مرحباً بك يا ${username}، تم ترقية حسابك وتفعيل كافة صلاحيات الإشراف والبث المباشر.</div>
                </div>
                <div style="background: #1f2937; border-radius: 8px; padding: 12px; border-right: 3px solid var(--success);">
                    <div style="font-weight: bold; color: var(--success); font-size: 0.9rem;">إشعار نظام الدفع والتبرعات</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">تم تفعيل نظام محاكاة الشحن السريع وباقات الماس بنجاح.</div>
                </div>
            </div>
        </div>

        <!-- 3. تبويب باقات الشحن والهدايا -->
        <div id="sec-packages" class="section-content ${activeTab === 'packages' ? 'active' : ''}">
            <div class="card">
                <h2 style="color: var(--gold-light); font-size: 1.05rem; margin-bottom: 10px;">💎 باقات الشحن الفوري</h2>
                <div class="packages-grid">
                    <div class="package-card">
                        <div>
                            <div style="font-weight: bold; color: var(--gold-light); font-size: 0.9rem;">باقة الفضة الذكية</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">💎 5,000 ماسة + تفاعل حر</div>
                        </div>
                        <button class="btn-gold" onclick="simulateBuy('باقة الفضة الذكية - 5,000 ماسة')">$9.99 شحن</button>
                    </div>
                    <div class="package-card" style="border-color: var(--gold-primary);">
                        <div>
                            <div style="font-weight: bold; color: var(--gold-light); font-size: 0.9rem;">باقة الذهب الفاخرة ⭐ (VIP)</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">💎 15,000 ماسة + إطار ذهبي للملف</div>
                        </div>
                        <button class="btn-gold" onclick="simulateBuy('باقة الذهب الفاخرة - 15,000 ماسة')">$24.99 شحن</button>
                    </div>
                </div>

                <h3 style="color: var(--gold-light); font-size: 1rem; margin: 16px 0 8px 0;">🎁 إرسال هدايا فورية للمشرف</h3>
                <p style="font-size: 0.8rem; color: var(--text-muted);">اختر هدية لإرسالها مباشرة داخل الغرفة النشطة:</p>
                <div class="gifts-grid">
                    <div class="gift-item" onclick="sendGift('👑 تاج ذهبي فاخر')">
                        <div style="font-size: 1.4rem;">👑</div>
                        <div style="font-size: 0.75rem; color: var(--gold-light); margin-top: 4px;">تاج ملكي</div>
                    </div>
                    <div class="gift-item" onclick="sendGift('💎 ماسة زرقاء براقة')">
                        <div style="font-size: 1.4rem;">💎</div>
                        <div style="font-size: 0.75rem; color: var(--gold-light); margin-top: 4px;">ماسة ثمينة</div>
                    </div>
                    <div class="gift-item" onclick="sendGift('⭐ درع الـ VIP الملكي')">
                        <div style="font-size: 1.4rem;">⭐</div>
                        <div style="font-size: 0.75rem; color: var(--gold-light); margin-top: 4px;">درع VIP</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. تبويب الحساب الشخصي و VIP -->
        <div id="sec-profile" class="section-content ${activeTab === 'profile' ? 'active' : ''}">
            <div class="card" style="text-align: center;">
                <h2 style="color: var(--gold-light); font-size: 1.1rem; margin-bottom: 12px;">👤 الملف الشخصي ورتبة الـ VIP</h2>
                <div style="background: var(--vip-gold); color: #000; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 12px; font-size: 0.85rem;">
                    👑 عضوية ذهبية VIP نشطة
                </div>
                <p style="color: var(--success); font-size: 0.95rem; margin-bottom: 6px;">اسم المستخدم: <strong>${username}</strong></p>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">الرتبة: المشرف العام والمسؤول التقني</p>
                <a href="/" class="btn-gold" style="background: #374151; color: var(--gold-light); display: inline-block; text-decoration: none; padding: 10px 20px;">🔄 تسجيل الخروج</a>
            </div>
        </div>

    </div>

    <!-- القائمة السفلية الملكية الشاملة -->
    <nav class="bottom-nav">
        <button class="nav-item ${activeTab === 'rooms' ? 'active' : ''}" onclick="switchTab('rooms')">
            <span>🏛️</span><span>الغرف</span>
        </button>
        <button class="nav-item ${activeTab === 'messages' ? 'active' : ''}" onclick="switchTab('messages')">
            <span>💬</span><span>الرسائل</span>
        </button>
        <button class="nav-item ${activeTab === 'packages' ? 'active' : ''}" onclick="switchTab('packages')">
            <span>💎</span><span>الباقات</span>
        </button>
        <button class="nav-item ${activeTab === 'profile' ? 'active' : ''}" onclick="switchTab('profile')">
            <span>👤</span><span>حسابي VIP</span>
        </button>
    </nav>

    <script>
        const socket = io();
        const username = "${username}";
        const roomName = "royal-platform-room";
        const userRole = "${role}";

        let localStream;
        let peerConnection;
        const videoElement = document.getElementById('remoteVideo');
        const placeholder = document.getElementById('placeholder');
        const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        const TOTAL_SEATS = 6;
        let seatsState = [];
        let mySeat = null;

        function renderSeats(seats) {
            seatsState = Array.isArray(seats) ? seats : [];

            const grid = document.getElementById('seatsGrid');
            const count = document.getElementById('seatCount');
            if (!grid) return;

            const occupied = seatsState.filter(s => s && s.username).length;
            if (count) count.textContent = occupied + '/' + TOTAL_SEATS;

            grid.innerHTML = '';

            for (let i = 1; i <= TOTAL_SEATS; i++) {
                const seat = seatsState.find(s => Number(s.seat) === i);
                const div = document.createElement('div');

                if (seat && seat.username) {
                    div.className = 'seat-card occupied';
                    div.innerHTML =
                        '<div class="seat-number">المقعد ' + i + '</div>' +
                        '<div class="seat-user">🎤 ' +
                        String(seat.username).replace(/[<>&"']/g, '') +
                        '</div>';
                    if (seat.username === username) mySeat = i;
                } else {
                    div.className = 'seat-card empty';
                    div.innerHTML =
                        '<div class="seat-number">المقعد ' + i + '</div>' +
                        '<div class="seat-user">🪑 شاغر</div>';
                }

                grid.appendChild(div);
            }
        }

        function requestSeat() {
            const select = document.getElementById('seatNumber');
            const seat = Number(select?.value || 0);

            if (!seat) {
                alert('اختر رقم المقعد أولاً');
                return;
            }

            socket.emit(
                'seat:request',
                { room: roomName, seat: seat, username: username },
                response => {
                    if (!response?.ok) {
                        alert('❌ ' + (response?.error || 'تعذر إرسال الطلب'));
                        return;
                    }
                    alert('🪑 تم إرسال طلب الجلوس إلى عطية');
                }
            );
        }

        function leaveSeat() {
            socket.emit(
                'seat:leave',
                { room: roomName },
                response => {
                    if (!response?.ok) {
                        alert('❌ ' + (response?.error || 'لا يوجد مقعد'));
                    }
                }
            );
        }

        function renderSeatRequests(requests) {
            const list = document.getElementById('seatRequestsList');
            if (!list) return;

            if (!requests.length) {
                list.innerHTML =
                    '<div style="font-size:.8rem;color:var(--text-muted);margin-top:6px;">' +
                    'لا توجد طلبات حالية</div>';
                return;
            }

            list.innerHTML = '';

            requests.forEach(req => {
                const row = document.createElement('div');
                row.className = 'seat-request';

                const info = document.createElement('span');
                info.textContent =
                    '🪑 المقعد ' + req.seat + ' — ' + req.username;

                const btn = document.createElement('button');
                btn.className = 'btn-gold';
                btn.textContent = '✅ قبول';

                btn.onclick = () => {
                    socket.emit(
                        'seat:accept',
                        {
                            room: roomName,
                            seat: req.seat,
                            socketId: req.socketId
                        },
                        response => {
                            if (!response?.ok) {
                                alert('❌ ' + (response?.error || 'تعذر قبول الطلب'));
                            }
                        }
                    );
                };

                row.appendChild(info);
                row.appendChild(btn);
                list.appendChild(row);
            });
        }

        socket.on('room:seats', data => {
            if (data && Array.isArray(data.seats)) {
                renderSeats(data.seats);
            }
        });

        socket.on('seat:request', data => {
            if (userRole === 'host' && data) {
                const current = window._seatRequests || [];
                const exists = current.some(
                    r => r.socketId === data.socketId && Number(r.seat) === Number(data.seat)
                );

                if (!exists) current.push(data);
                window._seatRequests = current;
                renderSeatRequests(current);
            }
        });

        socket.on('seat:accepted', data => {
            if (data?.socketId === socket.id || data?.username === username) {
                mySeat = Number(data.seat);
                alert('✅ عطية قبل طلب جلوسك في المقعد ' + data.seat);
            }
        });

        socket.on('seat:rejected', data => {
            if (data?.socketId === socket.id || data?.username === username) {
                alert('❌ تم رفض طلب الجلوس');
            }
        });

        socket.on('seat:request-removed', data => {
            if (userRole === 'host' && data) {
                window._seatRequests =
                    (window._seatRequests || []).filter(
                        r => r.socketId !== data.socketId
                    );
                renderSeatRequests(window._seatRequests);
            }
        });

        socket.on('connect', () => {
            socket.emit('join-room', { room: roomName, role: userRole, username: username });

            setTimeout(() => {
                socket.emit('seat:list', { room: roomName }, response => {
                    if (response?.ok) {
                        renderSeats(response.seats || []);
                    }
                });
            }, 150);
        });

        // التنقل السلس بين التبويبات والقوائم
        function switchTab(tabName) {
            document.querySelectorAll('.section-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById('sec-' + tabName).classList.add('active');
            event.currentTarget.classList.add('active');
        }

        // إرسال الرسائل والشات
        function sendMessage() {
            const input = document.getElementById('messageInput');
            if (input.value.trim() !== "") {
                socket.emit('chat-message', { room: roomName, user: username, text: input.value });
                input.value = "";
            }
        }

        socket.on('message', (data) => {
            const chatBox = document.getElementById('chatMessages');
            if(chatBox) {
                const msgDiv = document.createElement('div');
                msgDiv.style.margin = "4px 0";
                msgDiv.innerHTML = \`<span style="color: var(--gold-primary); font-weight: bold;">\${data.user}:</span> \${data.text}\`;
                chatBox.appendChild(msgDiv);
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        });

        // محاكاة الشحن والهدايا
        function simulateBuy(packageName) {
            if (confirm("هل تريد تأكيد شحن " + packageName + "؟")) {
                alert("🎉 تم الشحن بنجاح! أضيفت الماسات ورصيد الباقة لحسابك الملكي يا " + username);
            }
        }

        function sendGift(giftName) {
            socket.emit('chat-message', { room: roomName, user: "🎁 نظام الهدايا", text: username + " أرسل هدية مميزة: " + giftName });
            alert("✨ أرسلت هدية (" + giftName + ") بنجاح داخل الغرفة!");
        }

        // تشغيل الكاميرا والميكروفون (WebRTC)
        async function startBroadcast() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                videoElement.srcObject = localStream;
                placeholder.style.display = 'none';
                socket.emit('host-started-stream', roomName);
                alert("🟢 تم تفعيل الكاميرا والميكروفون وبثهما بنجاح!");
            } catch (err) {
                alert("❌ تعذر الوصول للكاميرا أو الميكروفون: " + err.message);
            }
        }

        function stopBroadcast() {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
                placeholder.style.display = 'block';
                socket.emit('host-stopped-stream', roomName);
            }
        }

        socket.on('start-peer-connection', async () => {
            if (userRole === 'viewer') {
                peerConnection = new RTCPeerConnection(servers);
                peerConnection.ontrack = (event) => {
                    videoElement.srcObject = event.streams[0];
                    placeholder.style.display = 'none';
                };
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) socket.emit('ice-candidate', { room: roomName, candidate: event.candidate });
                };
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('offer', { room: roomName, offer: offer });
            }
        });

        socket.on('offer', async (offer) => {
            if (userRole === 'host' && localStream) {
                peerConnection = new RTCPeerConnection(servers);
                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) socket.emit('ice-candidate', { room: roomName, candidate: event.candidate });
                };
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('answer', { room: roomName, answer: answer });
            }
        });

        socket.on('answer', async (answer) => {
            if (peerConnection) await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('ice-candidate', async (candidate) => {
            if (peerConnection) {
                try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
            }
        });

        socket.on('stream-stopped', () => {
            videoElement.srcObject = null;
            placeholder.style.display = 'block';
        });
    </script>
</body>
</html>`);
});

// معالجة قنوات وسوكت الاتصال الشاملة
const roomSeats = new Map();

function getRoomSeats(room) {
    if (!roomSeats.has(room)) roomSeats.set(room, []);
    return roomSeats.get(room);
}

function broadcastSeats(room) {
    io.to(room).emit('room:seats', {
        room,
        seats: getRoomSeats(room)
    });
}

io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
        const room = String(data?.room || '');
        const role = String(data?.role || 'viewer');
        const username = String(data?.username || '');

        socket.join(room);
        socket.data.room = room;
        socket.data.role = role;
        socket.data.username = username;

        socket.emit('room:seats', {
            room,
            seats: getRoomSeats(room)
        });
    });

    socket.on('seat:list', (data, callback) => {
        const room = String(data?.room || socket.data.room || '');
        const seats = getRoomSeats(room);

        if (typeof callback === 'function') {
            callback({ ok: true, seats });
        }
    });

    socket.on('seat:request', (data, callback) => {
        const room = String(data?.room || socket.data.room || '');
        const seat = Number(data?.seat || 0);
        const username = String(
            data?.username || socket.data.username || 'مستخدم'
        );

        if (!room || seat < 1 || seat > 6) {
            if (typeof callback === 'function') {
                callback({ ok: false, error: 'رقم المقعد غير صحيح' });
            }
            return;
        }

        const seats = getRoomSeats(room);

        if (seats.some(s => Number(s.seat) === seat)) {
            if (typeof callback === 'function') {
                callback({ ok: false, error: 'المقعد مشغول بالفعل' });
            }
            return;
        }

        const requests = io.sockets.adapter.rooms.get(room);

        if (requests) {
            for (const socketId of requests) {
                const target = io.sockets.sockets.get(socketId);
                if (target && target.data?.role === 'host') {
                    target.emit('seat:request', {
                        socketId: socket.id,
                        seat,
                        username
                    });
                }
            }
        }

        if (typeof callback === 'function') {
            callback({ ok: true });
        }
    });

    socket.on('seat:accept', (data, callback) => {
        if (socket.data.role !== 'host') {
            if (typeof callback === 'function') {
                callback({ ok: false, error: 'فقط المضيف يستطيع قبول الطلب' });
            }
            return;
        }

        const room = String(data?.room || socket.data.room || '');
        const seat = Number(data?.seat || 0);
        const targetId = String(data?.socketId || '');

        const target = io.sockets.sockets.get(targetId);

        if (!target || target.data?.room !== room) {
            if (typeof callback === 'function') {
                callback({ ok: false, error: 'المستخدم غير متصل' });
            }
            return;
        }

        const seats = getRoomSeats(room);

        if (seats.some(s => Number(s.seat) === seat)) {
            if (typeof callback === 'function') {
                callback({ ok: false, error: 'المقعد أصبح مشغولاً' });
            }
            return;
        }

        const oldSeat = seats.findIndex(s => s.socketId === targetId);
        if (oldSeat >= 0) seats.splice(oldSeat, 1);

        seats.push({
            seat,
            socketId: targetId,
            username: target.data?.username || 'مستخدم'
        });

        target.emit('seat:accepted', {
            socketId: targetId,
            seat,
            username: target.data?.username || 'مستخدم'
        });

        io.to(room).emit('seat:request-removed', {
            socketId: targetId,
            seat
        });

        broadcastSeats(room);

        if (typeof callback === 'function') {
            callback({ ok: true });
        }
    });

    socket.on('seat:leave', (data, callback) => {
        const room = String(data?.room || socket.data.room || '');
        const seats = getRoomSeats(room);

        const index = seats.findIndex(s => s.socketId === socket.id);

        if (index < 0) {
            if (typeof callback === 'function') {
                callback({ ok: false, error: 'أنت لست جالساً على مقعد' });
            }
            return;
        }

        seats.splice(index, 1);
        broadcastSeats(room);

        if (typeof callback === 'function') {
            callback({ ok: true });
        }
    });
    socket.on('host-started-stream', (room) => { io.to(room).emit('start-peer-connection'); });
    socket.on('host-stopped-stream', (room) => { io.to(room).emit('stream-stopped'); });
    socket.on('offer', (data) => { socket.to(data.room).emit('offer', data.offer); });
    socket.on('answer', (data) => { socket.to(data.room).emit('answer', data.answer); });
    socket.on('ice-candidate', (data) => { socket.to(data.room).emit('ice-candidate', data.candidate); });
    socket.on('chat-message', (data) => { io.to(data.room).emit('message', { user: data.user, text: data.text }); });
});

server.listen(PORT, () => {
    console.log('👑 منصة الهلباوي الملكية المتكاملة تعمل بنجاح على: http://localhost:' + PORT);
});
