const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

        /* PHASE_02_BIGO_SEATS_UI */
        .bigo-seats-card {
            background: #080b12;
            border: 1px solid var(--border-gold);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .bigo-seats-title {
            color: var(--gold-light);
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
        }

        .bigo-seats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }

        .bigo-seat {
            min-height: 72px;
            border: 1px solid var(--border-gold);
            border-radius: 10px;
            background: #1f2937;
            color: var(--gold-light);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.75rem;
        }

        .bigo-seat.free {
            border-color: var(--gold-primary);
        }

        .bigo-seat.occupied {
            background: #17251f;
            border-color: var(--success);
            cursor: default;
        }

        .bigo-seat-number {
            font-size: 1.25rem;
            margin-bottom: 4px;
        }

        .bigo-seat-name {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            padding: 0 4px;
        }

        .bigo-seat-status {
            color: var(--text-muted);
            text-align: center;
            font-size: 0.75rem;
            margin-top: 10px;
        }

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

                <!-- PHASE_02_BIGO_SEATS_UI -->
                <div class="bigo-seats-card">
                    <div class="bigo-seats-title">🎙️ مقاعد البث المباشر</div>
                    <div id="bigoSeats" class="bigo-seats-grid"></div>
                    <div id="bigoSeatStatus" class="bigo-seat-status">
                        اختر مقعدًا متاحًا لطلبه من المضيف.
                    </div>
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
                        <button class="btn-gold" style="padding: 6px;" onclick="document.getElementById('bigoSeats')?.scrollIntoView({behavior:'smooth', block:'center'})">اختيار مقعد</button>
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

        // الهوية الموحدة للواجهة الحالية — بدون تغيير الواجهة
        window.currentUser = {
            username: username,
            role: userRole
        };
        window.currentAccount = username;
        window.currentRoomId = null;
        window.activeRoomId = null;

        let localStream;
        let peerConnection;
        const peerConnections = new Map();
        const remoteStreams = new Map();
        const pendingIceCandidates = new Map();
        let bigoMediaReady = false;
        const videoElement = document.getElementById('remoteVideo');
        const placeholder = document.getElementById('placeholder');
        const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        socket.on('connect', () => {
            window.currentRoomId = roomName;
            window.activeRoomId = roomName;

            socket.emit('join-room', {
                room: roomName,
                role: userRole,
                username: window.currentUser.username
            });

            // PHASE_02_UI_BIGO_BIND
            socket.emit('bigo:join-room', {
                room: roomName,
                role: userRole,
                username: window.currentUser.username
            });
        });

        // PHASE_02_UI_BIGO_BIND
        window.bigoRoomState = null;

        socket.on('bigo:joined', (state) => {
            window.bigoRoomState = state;
            renderBigoSeats(state);
            console.log('[BIGO] joined', state);
        });

        socket.on('bigo:room-state', (state) => {
            window.bigoRoomState = state;
            renderBigoSeats(state);
            console.log('[BIGO] room-state', state);
        });

        function renderBigoSeats(state) {
            const container = document.getElementById('bigoSeats');
            const status = document.getElementById('bigoSeatStatus');

            if (!container) return;

            const seats = Array.isArray(state?.seats) ? state.seats : [];

            container.innerHTML = '';

            for (let i = 1; i <= 8; i++) {
                const seat = seats.find(
                    item => Number(item.seatNumber) === i
                );

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'bigo-seat';

                const number = document.createElement('div');
                number.className = 'bigo-seat-number';
                number.textContent = '🎙️ ' + i;

                const name = document.createElement('div');
                name.className = 'bigo-seat-name';

                if (seat && seat.username) {
                    button.classList.add('occupied');
                    name.textContent = seat.username;
                    button.disabled = true;
                } else {
                    button.classList.add('free');
                    name.textContent = 'مقعد متاح';

                    if (userRole === 'viewer') {
                        button.onclick = () => requestBigoSeat(i);
                    }
                }

                button.appendChild(number);
                button.appendChild(name);
                container.appendChild(button);
            }

            if (status) {
                const mine = seats.find(
                    item => item && item.socketId === socket.id
                );

                status.textContent = mine
                    ? '🎙️ أنت على المقعد رقم ' + mine.seatNumber
                    : 'اختر مقعدًا متاحًا لطلبه من المضيف.';
            }
        }

        socket.on('bigo:seat-requested', (data) => {
            // رسالة الطلب تظهر لطالب المقعد فقط
            if (userRole !== 'viewer') return;

            alert(
                '🎙️ تم إرسال طلب المقعد رقم ' +
                data.seatNumber +
                ' إلى المضيف.'
            );
        });

        socket.on('bigo:seat-accepted', async (data) => {
            if (userRole !== 'viewer') return;

            const status = document.getElementById('bigoSeatStatus');

            if (status) {
                status.textContent =
                    '✅ تمت الموافقة على طلبك. تم وضعك في المقعد رقم ' +
                    data.seatNumber +
                    ' — جاري تفعيل الكاميرا والميكروفون...';
            }

            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1,
                        sampleRate: 48000,
                        sampleSize: 16
                    }
                });

                videoElement.srcObject = localStream;
                videoElement.muted = true;
                placeholder.style.display = 'none';

                bigoMediaReady = true;

                socket.emit('bigo:media-ready', {
                    room: roomName,
                    seatNumber: data.seatNumber
                });

                if (status) {
                    status.textContent =
                        '🎙️ المقعد ' + data.seatNumber +
                        ' فعال — الكاميرا والميكروفون يعملان.';
                }

                console.log('[BIGO] media ready', data);
            } catch (err) {
                console.error('[BIGO] media error', err);

                if (status) {
                    status.textContent =
                        '⚠️ تعذر تشغيل الكاميرا أو الميكروفون: ' +
                        err.message;
                }
            }
        });

        socket.on('bigo:seat-rejected', (data) => {
            // رسالة الرفض تظهر للضيف صاحب الطلب فقط
            if (userRole !== 'viewer') return;

            alert(
                '❌ تم رفض طلب المقعد: ' +
                (data.reason || 'تم رفض الطلب.')
            );
        });

        socket.on('bigo:seat-request', (data) => {
            if (userRole !== 'host') return;

            const accept = confirm(
                '🎙️ طلب مقعد جديد\\n\\n' +
                'المستخدم: ' + data.username + '\\n' +
                'المقعد المطلوب: ' + data.seatNumber + '\\n\\n' +
                'اضغط موافق لقبول الطلب أو إلغاء لرفضه.'
            );

            if (accept) {
                socket.emit('bigo:seat-accept', {
                    room: roomName,
                    requestId: data.requestId
                });
            } else {
                socket.emit('bigo:seat-reject', {
                    room: roomName,
                    requestId: data.requestId,
                    reason: 'تم رفض الطلب من المضيف.'
                });
            }
        });

        socket.on('bigo:error', (data) => {
            console.error('[BIGO ERROR]', data);
            alert('⚠️ ' + (data.message || 'حدث خطأ في غرفة البث.'));
        });

        function requestBigoSeat(seatNumber) {
            if (userRole === 'host') {
                alert('👑 أنت المضيف ولا تحتاج إلى طلب مقعد.');
                return;
            }

            if (!Number.isInteger(Number(seatNumber))) {
                alert('⚠️ اختر رقم المقعد أولًا.');
                return;
            }

            socket.emit('bigo:seat-request', {
                room: roomName,
                seatNumber: Number(seatNumber)
            });
        }

        function leaveBigoSeat() {
            socket.emit('bigo:seat-leave', {
                room: roomName
            });
        }

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
                socket.emit('chat-message', {
                    room: window.currentRoomId || roomName,
                    user: window.currentUser.username,
                    text: input.value
                });
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

        // تشغيل الكاميرا والميكروفون وربط المقاعد المقبولة عبر WebRTC
        function createBigoPeer(targetSocketId, initiator) {
            let pc = peerConnections.get(targetSocketId);

            if (pc) return pc;

            pc = new RTCPeerConnection(servers);

            if (localStream) {
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });
            }

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('bigo:media-ice', {
                        room: roomName,
                        targetSocketId: targetSocketId,
                        candidate: event.candidate
                    });
                }
            };

            pc.ontrack = (event) => {
                const stream = event.streams[0];
                remoteStreams.set(targetSocketId, stream);

                if (userRole === 'viewer') {
                    videoElement.srcObject = stream;
                    placeholder.style.display = 'none';
                    return;
                }

                let remoteVideo = document.getElementById(
                    'bigo-remote-' + targetSocketId
                );

                if (!remoteVideo) {
                    remoteVideo = document.createElement('video');
                    remoteVideo.id = 'bigo-remote-' + targetSocketId;
                    remoteVideo.autoplay = true;
                    remoteVideo.playsInline = true;
                    remoteVideo.style.width = '100%';
                    remoteVideo.style.maxHeight = '240px';
                    remoteVideo.style.marginTop = '8px';
                    remoteVideo.style.borderRadius = '12px';

                    const parent = videoElement.parentElement;
                    if (parent) parent.appendChild(remoteVideo);
                }

                remoteVideo.srcObject = stream;
            };

            pc.onconnectionstatechange = () => {
                if (
                    pc.connectionState === 'failed' ||
                    pc.connectionState === 'closed'
                ) {
                    peerConnections.delete(targetSocketId);
                    remoteStreams.delete(targetSocketId);
                    pendingIceCandidates.delete(targetSocketId);
                }
            };

            peerConnections.set(targetSocketId, pc);

            if (initiator) {
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => {
                        socket.emit('bigo:media-offer', {
                            room: roomName,
                            targetSocketId: targetSocketId,
                            offer: pc.localDescription
                        });
                    })
                    .catch(err => {
                        console.error('[BIGO] offer error', err);
                    });
            }

            return pc;
        }

        async function startBroadcast() {
            if (userRole !== 'host') return;

            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1,
                        sampleRate: 48000,
                        sampleSize: 16
                    }
                });

                videoElement.srcObject = localStream;
                videoElement.muted = true;
                placeholder.style.display = 'none';

                socket.emit('host-started-stream', roomName);

                const state = window.bigoRoomState;
                if (state && Array.isArray(state.seats)) {
                    state.seats.forEach(seat => {
                        if (seat && seat.socketId) {
                            createBigoPeer(seat.socketId, true);
                        }
                    });
                }

                console.log('[BIGO] host media started');
            } catch (err) {
                alert('❌ تعذر الوصول للكاميرا أو الميكروفون: ' + err.message);
            }
        }

        function stopBroadcast() {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
                videoElement.srcObject = null;
                placeholder.style.display = 'block';
                socket.emit('host-stopped-stream', roomName);
            }
        }

        socket.on('bigo:media-ready', (data) => {
            if (userRole !== 'host') return;
            if (!localStream) return;

            createBigoPeer(data.socketId, true);
        });

        socket.on('bigo:media-offer', async (data) => {
            if (!data || !data.fromSocketId || !data.offer) return;

            const pc = createBigoPeer(data.fromSocketId, false);

            try {
                await pc.setRemoteDescription(
                    new RTCSessionDescription(data.offer)
                );

                const queuedIce =
                    pendingIceCandidates.get(data.fromSocketId) || [];

                for (const candidate of queuedIce) {
                    try {
                        await pc.addIceCandidate(candidate);
                    } catch (iceErr) {
                        console.error('[BIGO] queued ICE error', iceErr);
                    }
                }

                pendingIceCandidates.delete(data.fromSocketId);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('bigo:media-answer', {
                    room: roomName,
                    targetSocketId: data.fromSocketId,
                    answer: pc.localDescription
                });
            } catch (err) {
                console.error('[BIGO] offer handling error', err);
            }
        });

        socket.on('bigo:media-answer', async (data) => {
            if (!data || !data.fromSocketId || !data.answer) return;

            const pc = peerConnections.get(data.fromSocketId);
            if (!pc) return;

            try {
                await pc.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );
            } catch (err) {
                console.error('[BIGO] answer error', err);
            }
        });

        socket.on('bigo:media-ice', async (data) => {
            if (!data || !data.fromSocketId || !data.candidate) return;

            const candidate = new RTCIceCandidate(data.candidate);
            const pc = peerConnections.get(data.fromSocketId);

            if (!pc || !pc.remoteDescription) {
                const queue =
                    pendingIceCandidates.get(data.fromSocketId) || [];

                queue.push(candidate);

                pendingIceCandidates.set(
                    data.fromSocketId,
                    queue
                );

                return;
            }

            try {
                await pc.addIceCandidate(candidate);
            } catch (err) {
                console.error('[BIGO] ICE error', err);
            }
        });

        socket.on('start-peer-connection', () => {
            console.log('[BIGO] legacy stream signal ignored for seat WebRTC');
        });

        socket.on('stream-stopped', () => {
            if (userRole === 'viewer') {
                videoElement.srcObject = null;
                placeholder.style.display = 'block';
            }
        });
    </script>
</body>
</html>`);
});


// ============================================================
// PHASE_02_BIGO_ROOM_ENGINE
// محرك غرف متعدد المستخدمين بأسلوب Bigo Live
// بدون تغيير واجهة المستخدم الحالية
// ============================================================

const BIGO_ROOM = {
    id: 'royal-platform-room',
    maxGuests: 8,
    maxViewers: 1000
};

// الحالة الحية للغرف.
// roomId -> {
//   hostSocketId,
//   members: Map(socketId -> member),
//   seats: Map(seatNumber -> seat),
//   pendingRequests: Map(requestId -> request)
// }
const bigoRooms = new Map();

function createBigoRoom(roomId) {
    if (!bigoRooms.has(roomId)) {
        const seats = new Map();

        for (let i = 1; i <= BIGO_ROOM.maxGuests; i++) {
            seats.set(i, null);
        }

        bigoRooms.set(roomId, {
            hostSocketId: null,
            members: new Map(),
            seats,
            pendingRequests: new Map()
        });
    }

    return bigoRooms.get(roomId);
}

function getBigoRoom(roomId) {
    return bigoRooms.get(roomId) || createBigoRoom(roomId);
}

function publicBigoRoomState(roomId) {
    const room = getBigoRoom(roomId);

    const members = Array.from(room.members.values()).map(member => ({
        socketId: member.socketId,
        username: member.username,
        role: member.role,
        seatNumber: member.seatNumber || null
    }));

    const seats = Array.from(room.seats.entries()).map(
        ([seatNumber, occupant]) => ({
            seatNumber,
            occupied: Boolean(occupant),
            socketId: occupant ? occupant.socketId : null,
            username: occupant ? occupant.username : null
        })
    );

    const requests = Array.from(room.pendingRequests.values()).map(request => ({
        requestId: request.requestId,
        socketId: request.socketId,
        username: request.username,
        type: request.type,
        seatNumber: request.seatNumber || null,
        status: request.status
    }));

    return {
        roomId,
        hostSocketId: room.hostSocketId,
        members,
        seats,
        requests
    };
}

function emitBigoRoomState(io, roomId) {
    io.to(roomId).emit(
        'bigo:room-state',
        publicBigoRoomState(roomId)
    );
}

function findFreeSeat(room) {
    for (let i = 1; i <= BIGO_ROOM.maxGuests; i++) {
        if (!room.seats.get(i)) {
            return i;
        }
    }

    return null;
}

function removeMemberFromBigoRoom(io, socketId, roomId) {
    const room = bigoRooms.get(roomId);

    if (!room) {
        return;
    }

    const member = room.members.get(socketId);

    if (member && member.seatNumber) {
        room.seats.set(member.seatNumber, null);
    }

    room.members.delete(socketId);

    for (const [requestId, request] of room.pendingRequests) {
        if (request.socketId === socketId) {
            room.pendingRequests.delete(requestId);
        }
    }

    if (room.hostSocketId === socketId) {
        room.hostSocketId = null;
    }

    emitBigoRoomState(io, roomId);

    if (
        room.members.size === 0 &&
        room.pendingRequests.size === 0
    ) {
        bigoRooms.delete(roomId);
    }
}

function isBigoHost(socket, roomId) {
    const room = bigoRooms.get(roomId);
    return Boolean(
        room &&
        room.hostSocketId === socket.id
    );
}

function getBigoMember(roomId, socketId) {
    const room = bigoRooms.get(roomId);

    if (!room) {
        return null;
    }

    return room.members.get(socketId) || null;
}

// معالجة قنوات وسوكت الاتصال الشاملة
io.on('connection', (socket) => {

    // --------------------------------------------------------
    // Bigo Live — الانضمام إلى غرفة متعددة المستخدمين
    // --------------------------------------------------------
    socket.on('bigo:join-room', (data = {}) => {
        const roomId = String(
            data.room || BIGO_ROOM.id
        );

        const username = String(
            data.username || 'مستخدم'
        ).trim().slice(0, 100);

        const role =
            data.role === 'host'
                ? 'host'
                : 'viewer';

        const room = getBigoRoom(roomId);

        if (
            room.members.size >= BIGO_ROOM.maxViewers &&
            !room.members.has(socket.id)
        ) {
            socket.emit('bigo:error', {
                code: 'ROOM_FULL',
                message: 'الغرفة ممتلئة حاليًا.'
            });
            return;
        }

        if (role === 'host') {
            if (
                room.hostSocketId &&
                room.hostSocketId !== socket.id
            ) {
                socket.emit('bigo:error', {
                    code: 'HOST_EXISTS',
                    message: 'يوجد مضيف حاليًا في هذه الغرفة.'
                });
                return;
            }

            room.hostSocketId = socket.id;
        }

        room.members.set(socket.id, {
            socketId: socket.id,
            username,
            role,
            roomId,
            seatNumber: null
        });

        socket.join(roomId);

        socket.data.bigoRoomId = roomId;
        socket.data.bigoUsername = username;
        socket.data.bigoRole = role;

        socket.emit(
            'bigo:joined',
            publicBigoRoomState(roomId)
        );

        emitBigoRoomState(io, roomId);
    });

    // --------------------------------------------------------
    // Bigo Live — طلب مقعد
    // --------------------------------------------------------
    socket.on('bigo:seat-request', (data = {}) => {
        const roomId = String(
            data.room || socket.data.bigoRoomId || BIGO_ROOM.id
        );

        const room = bigoRooms.get(roomId);
        const member = getBigoMember(roomId, socket.id);

        if (!room || !member) {
            socket.emit('bigo:error', {
                code: 'NOT_IN_ROOM',
                message: 'يجب دخول الغرفة أولًا.'
            });
            return;
        }

        if (member.role === 'host') {
            socket.emit('bigo:error', {
                code: 'HOST_NO_SEAT_REQUEST',
                message: 'المضيف لا يحتاج إلى طلب مقعد.'
            });
            return;
        }

        if (member.seatNumber) {
            socket.emit('bigo:error', {
                code: 'ALREADY_SEATED',
                message: 'أنت بالفعل على مقعد.'
            });
            return;
        }

        const requestedSeat = Number(data.seatNumber);

        let seatNumber = null;

        if (
            Number.isInteger(requestedSeat) &&
            requestedSeat >= 1 &&
            requestedSeat <= BIGO_ROOM.maxGuests
        ) {
            if (!room.seats.get(requestedSeat)) {
                seatNumber = requestedSeat;
            }
        } else {
            seatNumber = findFreeSeat(room);
        }

        if (!seatNumber) {
            socket.emit('bigo:error', {
                code: 'NO_FREE_SEAT',
                message: 'لا يوجد مقعد متاح حاليًا.'
            });
            return;
        }

        const requestId =
            `${socket.id}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        room.pendingRequests.set(requestId, {
            requestId,
            socketId: socket.id,
            username: member.username,
            type: 'seat',
            seatNumber,
            status: 'pending'
        });

        socket.emit('bigo:seat-requested', {
            requestId,
            seatNumber
        });

        if (room.hostSocketId) {
            io.to(room.hostSocketId).emit(
                'bigo:seat-request',
                {
                    requestId,
                    socketId: socket.id,
                    username: member.username,
                    seatNumber
                }
            );
        }

        emitBigoRoomState(io, roomId);
    });

    // --------------------------------------------------------
    // Bigo Live — قبول طلب المقعد
    // --------------------------------------------------------
    socket.on('bigo:seat-accept', (data = {}) => {
        const roomId = String(
            data.room || socket.data.bigoRoomId || BIGO_ROOM.id
        );

        if (!isBigoHost(socket, roomId)) {
            socket.emit('bigo:error', {
                code: 'HOST_ONLY',
                message: 'قبول المقاعد متاح للمضيف فقط.'
            });
            return;
        }

        const room = bigoRooms.get(roomId);

        if (!room) {
            return;
        }

        const requestId = String(
            data.requestId || ''
        );

        const request = room.pendingRequests.get(requestId);

        if (!request || request.status !== 'pending') {
            socket.emit('bigo:error', {
                code: 'REQUEST_NOT_FOUND',
                message: 'طلب المقعد غير موجود أو انتهى.'
            });
            return;
        }

        const member = room.members.get(request.socketId);

        if (!member) {
            room.pendingRequests.delete(requestId);
            emitBigoRoomState(io, roomId);
            return;
        }

        const seatNumber = request.seatNumber;

        if (room.seats.get(seatNumber)) {
            socket.emit('bigo:error', {
                code: 'SEAT_TAKEN',
                message: 'المقعد تم حجزه بالفعل.'
            });
            return;
        }

        if (member.seatNumber) {
            socket.emit('bigo:error', {
                code: 'ALREADY_SEATED',
                message: 'المستخدم على مقعد بالفعل.'
            });
            return;
        }

        room.seats.set(seatNumber, member);

        member.seatNumber = seatNumber;

        request.status = 'accepted';
        room.pendingRequests.delete(requestId);

        io.to(request.socketId).emit(
            'bigo:seat-accepted',
            {
                room: roomId,
                seatNumber
            }
        );

        emitBigoRoomState(io, roomId);
    });

    // --------------------------------------------------------
    // Bigo Live — رفض طلب المقعد
    // --------------------------------------------------------
    socket.on('bigo:seat-reject', (data = {}) => {
        const roomId = String(
            data.room || socket.data.bigoRoomId || BIGO_ROOM.id
        );

        if (!isBigoHost(socket, roomId)) {
            socket.emit('bigo:error', {
                code: 'HOST_ONLY',
                message: 'رفض المقاعد متاح للمضيف فقط.'
            });
            return;
        }

        const room = bigoRooms.get(roomId);

        if (!room) {
            return;
        }

        const requestId = String(
            data.requestId || ''
        );

        const request = room.pendingRequests.get(requestId);

        if (!request) {
            socket.emit('bigo:error', {
                code: 'REQUEST_NOT_FOUND',
                message: 'طلب المقعد غير موجود.'
            });
            return;
        }

        room.pendingRequests.delete(requestId);

        io.to(request.socketId).emit(
            'bigo:seat-rejected',
            {
                room: roomId,
                requestId,
                reason: String(
                    data.reason || 'تم رفض طلب المقعد.'
                ).slice(0, 200)
            }
        );

        emitBigoRoomState(io, roomId);
    });

    // --------------------------------------------------------
    // Bigo Live — خروج الضيف من المقعد
    // --------------------------------------------------------
    socket.on('bigo:seat-leave', (data = {}) => {
        const roomId = String(
            data.room || socket.data.bigoRoomId || BIGO_ROOM.id
        );

        const room = bigoRooms.get(roomId);
        const member = getBigoMember(roomId, socket.id);

        if (!room || !member) {
            return;
        }

        if (member.seatNumber) {
            room.seats.set(member.seatNumber, null);
            member.seatNumber = null;
        }

        emitBigoRoomState(io, roomId);
    });

    // --------------------------------------------------------
    // Bigo Live — طلبات الحالة الحالية
    // --------------------------------------------------------
    socket.on('bigo:get-room-state', (data = {}) => {
        const roomId = String(
            data.room || socket.data.bigoRoomId || BIGO_ROOM.id
        );

        socket.emit(
            'bigo:room-state',
            publicBigoRoomState(roomId)
        );
    });

    // PHASE_02_BIGO_DISCONNECT
    socket.on('disconnect', () => {
        try {
            const roomId = socket.data?.bigoRoomId;

            if (roomId) {
                removeMemberFromBigoRoom(
                    io,
                    socket.id,
                    roomId
                );
            }
        } catch (error) {
            console.error(
                '[PHASE_02_BIGO_DISCONNECT]',
                error.message
            );
        }
    });

    socket.on('join-room', (data) => { socket.join(data.room); });
    socket.on('host-started-stream', (room) => {
        io.to(room).emit('start-peer-connection');
    });

    socket.on('host-stopped-stream', (room) => {
        io.to(room).emit('stream-stopped');
    });

    // Bigo WebRTC — توجيه الإشارات بين المضيف والضيف المحدد فقط
    socket.on('bigo:media-ready', (data) => {
        if (!data || !data.room) return;

        const room = bigoRooms.get(data.room);
        if (!room) return;

        const member = room.members.get(socket.id);
        if (!member || !member.seatNumber) return;

        if (room.hostSocketId) {
            io.to(room.hostSocketId).emit('bigo:media-ready', {
                room: data.room,
                socketId: socket.id,
                username: member.username,
                seatNumber: member.seatNumber
            });
        }
    });

    socket.on('bigo:media-offer', (data) => {
        if (!data || !data.targetSocketId || !data.offer) return;

        io.to(data.targetSocketId).emit('bigo:media-offer', {
            room: data.room,
            fromSocketId: socket.id,
            offer: data.offer
        });
    });

    socket.on('bigo:media-answer', (data) => {
        if (!data || !data.targetSocketId || !data.answer) return;

        io.to(data.targetSocketId).emit('bigo:media-answer', {
            room: data.room,
            fromSocketId: socket.id,
            answer: data.answer
        });
    });

    socket.on('bigo:media-ice', (data) => {
        if (!data || !data.targetSocketId || !data.candidate) return;

        io.to(data.targetSocketId).emit('bigo:media-ice', {
            room: data.room,
            fromSocketId: socket.id,
            candidate: data.candidate
        });
    });

    socket.on('offer', (data) => { socket.to(data.room).emit('offer', data.offer); });
    socket.on('answer', (data) => { socket.to(data.room).emit('answer', data.answer); });
    socket.on('ice-candidate', (data) => { socket.to(data.room).emit('ice-candidate', data.candidate); });
    socket.on('chat-message', (data) => { io.to(data.room).emit('message', { user: data.user, text: data.text }); });
});

server.listen(PORT, () => {
    console.log('👑 منصة الهلباوي الملكية المتكاملة تعمل بنجاح على: http://localhost:' + PORT);
});
