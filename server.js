const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    let htmlContent = '<!DOCTYPE html>\n' +
    '<html lang="ar" dir="rtl">\n' +
    '<head>\n' +
    '    <meta charset="UTF-8">\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '    <title>الهلباوى LexBridge — المحفظة و VIP</title>\n' +
    '    <style>\n' +
    '        :root {\n' +
    '            --bg-color: #080b12;\n' +
    '            --card-bg: #111827;\n' +
    '            --gold-primary: #d4af37;\n' +
    '            --gold-light: #f3e5ab;\n' +
    '            --gold-dark: #aa8c2c;\n' +
    '            --text-main: #f9fafb;\n' +
    '            --text-muted: #9ca3af;\n' +
    '            --border-gold: rgba(212, 175, 55, 0.3);\n' +
    '            --danger: #ef4444;\n' +
    '            --success: #10b981;\n' +
    '        }\n' +
    '        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }\n' +
    '        body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; padding-bottom: 90px; }\n' +
    '        .royal-header { background: linear-gradient(135deg, #1a1500, #080b12); border-bottom: 2px solid var(--gold-primary); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }\n' +
    '        .brand-title { font-size: 1.1rem; font-weight: bold; color: var(--gold-light); }\n' +
    '        .user-welcome { font-size: 0.85rem; color: var(--text-muted); text-align: left; }\n' +
    '        .user-welcome span { color: var(--gold-primary); font-weight: bold; display: block; }\n' +
    '        .container { padding: 16px; max-width: 900px; margin: 0 auto; }\n' +
    '        .section-view { display: none; }\n' +
    '        .section-view.active { display: block; }\n' +
    '        .hero-banner { background: linear-gradient(135deg, #111827, #1f2937); border: 1px solid var(--border-gold); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }\n' +
    '        .btn-gold { background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary)); color: #000; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; font-size: 0.95rem; }\n' +
    '        .btn-outline { background: transparent; border: 1px solid var(--gold-primary); color: var(--gold-light); padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; }\n' +
    '        .section-header { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 12px 0; }\n' +
    '        .section-title { font-size: 1.05rem; color: var(--gold-primary); border-right: 3px solid var(--gold-primary); padding-right: 8px; }\n' +
    '        /* الغرفة المباشرة والهدايا */\n' +
    '        .live-room-box { background: linear-gradient(180deg, #111827, #080b12); border: 2px solid var(--gold-primary); border-radius: 16px; padding: 16px; text-align: center; position: relative; }\n' +
    '        .camera-preview-box { width: 100%; height: 200px; background: #000; border: 2px solid var(--gold-primary); border-radius: 12px; margin-bottom: 12px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }\n' +
    '        .camera-preview-box video { width: 100%; height: 100%; object-fit: cover; display: none; }\n' +
    '        .camera-placeholder { color: var(--text-muted); font-size: 0.85rem; display: flex; flex-direction: column; align-items: center; gap: 4px; }\n' +
    '        .seats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }\n' +
    '        .seat { background: #1f2937; border: 2px dashed var(--gold-primary); border-radius: 50%; width: 60px; height: 60px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--gold-light); position: relative; }\n' +
    '        .seat.occupied { border-style: solid; background: #374151; }\n' +
    '        .seat.speaking { border-color: var(--success); box-shadow: 0 0 10px var(--success); }\n' +
    '        #gift-announcement { background: rgba(212, 175, 55, 0.2); border: 1px solid var(--gold-primary); border-radius: 8px; padding: 8px; margin-bottom: 12px; font-size: 0.85rem; color: var(--gold-light); display: none; }\n' +
    '        .gifts-modal { display: none; position: fixed; bottom: 70px; left: 16px; right: 16px; background: #111827; border: 2px solid var(--gold-primary); border-radius: 14px; padding: 16px; z-index: 2000; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }\n' +
    '        .gifts-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }\n' +
    '        .gift-item { background: #1f2937; border: 1px solid var(--border-gold); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; }\n' +
    '        /* الملف الشخصي والمحفظة و VIP */\n' +
    '        .profile-card { background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 12px; padding: 18px; margin-bottom: 14px; text-align: center; }\n' +
    '        .profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary)); color: #000; font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; border: 2px solid var(--gold-light); }\n' +
    '        .wallet-box { background: linear-gradient(135deg, #1a1500, #111827); border: 2px solid var(--gold-primary); border-radius: 12px; padding: 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }\n' +
    '        .vip-badge-card { background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 12px; padding: 16px; margin-bottom: 12px; }\n' +
    '        .menu-list { display: flex; flex-direction: column; gap: 8px; }\n' +
    '        .menu-item { background: var(--card-bg); border: 1px solid var(--border-gold); padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; color: var(--text-main); cursor: pointer; font-size: 0.9rem; }\n' +
    '        /* الشات */\n' +
    '        .chat-container { background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 12px; display: flex; flex-direction: column; height: 400px; overflow: hidden; }\n' +
    '        .chat-messages { flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; text-align: right; }\n' +
    '        .chat-bubble { background: #1f2937; border: 1px solid var(--border-gold); padding: 8px 12px; border-radius: 8px; max-width: 80%; font-size: 0.85rem; }\n' +
    '        .chat-bubble.mine { background: rgba(212, 175, 55, 0.15); align-self: flex-start; border-color: var(--gold-primary); }\n' +
    '        .chat-sender { font-size: 0.7rem; color: var(--gold-light); margin-bottom: 2px; font-weight: bold; }\n' +
    '        .chat-input-box { display: flex; padding: 10px; background: #080b12; border-top: 1px solid var(--border-gold); gap: 8px; }\n' +
    '        .form-control { width: 100%; background: var(--bg-color); border: 1px solid var(--border-gold); padding: 10px; border-radius: 8px; color: #fff; font-size: 0.9rem; }\n' +
    '        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #080b12; border-top: 2px solid var(--gold-primary); display: flex; justify-content: space-around; padding: 10px 0; z-index: 1000; }\n' +
    '        .nav-item { background: none; border: none; color: var(--text-muted); font-size: 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }\n' +
    '        .nav-item.active { color: var(--gold-primary); }\n' +
    '    </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '    <header class="royal-header">\n' +
    '        <div class="brand-title">👑 الهلباوى LexBridge</div>\n' +
    '        <div class="user-welcome">مرحبًا <span id="header-username">عطيه</span> <span>الحساب: atya</span></div>\n' +
    '    </header>\n' +
    '    <div class="container">\n' +
    '        <!-- الرئيسية -->\n' +
    '        <div id="view-home" class="section-view active">\n' +
    '            <div class="hero-banner">\n' +
    '                <button class="btn-gold" onclick="enterLiveRoom()">🎙️ دخول غرفتي النشطة</button>\n' +
    '            </div>\n' +
    '            <div class="section-header"><h2 class="section-title">📢 إعلانات الغرف والأحداث</h2></div>\n' +
    '            <div style="background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 10px; padding: 16px; text-align: center; color: var(--text-muted); margin-bottom: 16px;">الغرفة العامة النشطة جاهزة للبث</div>\n' +
    '        </div>\n' +
    '        <!-- صالة الغرفة الصوتية والمرئية والهدايا -->\n' +
    '        <div id="view-liveroom" class="section-view">\n' +
    '            <div class="live-room-box">\n' +
    '                <div style="font-size: 1.1rem; font-weight: bold; color: var(--gold-light); margin-bottom: 3px;">الغرفة العامة النشطة</div>\n' +
    '                <div id="room-status-text" style="font-size: 0.8rem; color: var(--success); margin-bottom: 8px;">● المايك مفتوح ومتصل بالبث</div>\n' +
    '                <div id="gift-announcement">🎁 تم إرسال هدية بنجاح!</div>\n' +
    '                <div class="camera-preview-box">\n' +
    '                    <div id="cam-placeholder" class="camera-placeholder">\n' +
    '                        <span style="font-size: 1.8rem;">📹</span>\n' +
    '                        <span>الكاميرا مغلقة. اضغط فتح الكاميرا بالأسفل</span>\n' +
    '                    </div>\n' +
    '                    <video id="webcamVideo" autoplay playsinline></video>\n' +
    '                </div>\n' +
    '                <div class="seats-grid">\n' +
    '                    <div id="host-seat" class="seat occupied speaking">👑<span style="font-size:0.55rem">عطيه</span></div>\n' +
    '                    <div class="seat">💺 مقعد 2</div>\n' +
    '                    <div class="seat">💺 مقعد 3</div>\n' +
    '                    <div class="seat">💺 مقعد 4</div>\n' +
    '                    <div class="seat">💺 مقعد 5</div>\n' +
    '                    <div class="seat">💺 مقعد 6</div>\n' +
    '                </div>\n' +
    '                <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">\n' +
    '                    <button id="mic-toggle-btn" class="btn-gold" style="padding: 8px 12px; font-size:0.85rem;" onclick="toggleMic()">🎙️ قفل المايك</button>\n' +
    '                    <button id="cam-toggle-btn" class="btn-outline" style="padding: 8px 12px; font-size:0.85rem;" onclick="toggleCamera()">📹 فتح الكاميرا</button>\n' +
    '                    <button class="btn-gold" style="background: linear-gradient(135deg, #f59e0b, #d97706); color:#fff; padding: 8px 12px; font-size:0.85rem;" onclick="toggleGiftsModal()">🎁 الهدايا</button>\n' +
    '                    <button class="btn-outline" style="border-color: var(--danger); color: var(--danger); padding: 8px 10px; font-size:0.85rem;" onclick="switchTab(\'home\', document.querySelectorAll(\'.nav-item\')[0])">🚪</button>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '        <!-- نافذة الهدايا -->\n' +
    '        <div id="gifts-modal" class="gifts-modal">\n' +
    '            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">\n' +
    '                <span style="font-weight: bold; color: var(--gold-light);">🎁 هدايا الهلباوى الملكية</span>\n' +
    '                <button onclick="toggleGiftsModal()" style="background:none; border:none; color:#fff; font-size:1.1rem; cursor:pointer;">✕</button>\n' +
    '            </div>\n' +
    '            <div class="gifts-grid">\n' +
    '                <div class="gift-item" onclick="sendGift(\'🌹 وردة\', 10)"><div style="font-size:1.5rem">🌹</div><div style="font-size:0.75rem; color:var(--gold-light);">وردة</div><div style="font-size:0.65rem; color:var(--text-muted)">10 ماس</div></div>\n' +
    '                <div class="gift-item" onclick="sendGift(\'👑 تاج\', 100)"><div style="font-size:1.5rem">👑</div><div style="font-size:0.75rem; color:var(--gold-light);">تاج</div><div style="font-size:0.65rem; color:var(--text-muted)">100 ماس</div></div>\n' +
    '                <div class="gift-item" onclick="sendGift(\'💍 خاتم\', 250)"><div style="font-size:1.5rem">💍</div><div style="font-size:0.75rem; color:var(--gold-light);">خاتم</div><div style="font-size:0.65rem; color:var(--text-muted)">250 ماس</div></div>\n' +
    '                <div class="gift-item" onclick="sendGift(\'🏎️ سيارة\', 1000)"><div style="font-size:1.5rem">🏎️</div><div style="font-size:0.75rem; color:var(--gold-light);">سيارة</div><div style="font-size:0.65rem; color:var(--text-muted)">1000 ماس</div></div>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '        <!-- النشاط -->\n' +
    '        <div id="view-activity" class="section-view">\n' +
    '            <div class="section-header"><h2 class="section-title">📊 النشاط والأحداث</h2></div>\n' +
    '            <div style="background:var(--card-bg); border:1px solid var(--border-gold); border-radius:12px; padding:16px;">\n' +
    '                <div style="color:var(--gold-primary); font-weight:bold; margin-bottom:6px;">سجل البث والغرف</div>\n' +
    '                <div style="font-size:0.85rem; color:var(--text-muted);">جميع الأنشطة الملكية تسجل هنا تلقائياً.</div>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '        <!-- الرسائل -->\n' +
    '        <div id="view-messages" class="section-view">\n' +
    '            <div class="section-header"><h2 class="section-title">💬 الشات والرسائل المباشرة</h2></div>\n' +
    '            <div class="chat-container">\n' +
    '                <div id="chat-messages-box" class="chat-messages">\n' +
    '                    <div class="chat-bubble">\n' +
    '                        <div class="chat-sender">👑 الإدارة العامة</div>\n' +
    '                        <div>مرحباً بك يا عطيه في منصة الهلباوي LexBridge الاجتماعية. الشات يعمل بكامل الوظائف!</div>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div class="chat-input-box">\n' +
    '                    <input type="text" id="chatInput" placeholder="اكتب رسالتك..." class="form-control" onkeypress="if(event.key===\'Enter\') sendChatMessage()">\n' +
    '                    <button class="btn-gold" style="padding: 8px 16px;" onclick="sendChatMessage()">إرسال</button>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '        <!-- الملف الشخصي (المحفظة و VIP) -->\n' +
    '        <div id="view-profile" class="section-view">\n' +
    '            <div class="section-header"><h2 class="section-title">👤 الملف الشخصي والمحفظة و VIP</h2></div>\n' +
    '            <div class="profile-card">\n' +
    '                <div class="profile-avatar">ع</div>\n' +
    '                <div style="color: var(--gold-light); font-weight: bold; font-size: 1.1rem; margin-bottom: 4px;">عطيه (atya)</div>\n' +
    '                <div style="font-size: 0.85rem; color: var(--success); margin-bottom: 8px;">● متصل الآن • المشرف العام</div>\n' +
    '            </div>\n' +
    '\n' +
    '            <!-- لوحة المحفظة ورصيد الماس -->\n' +
    '            <div class="wallet-box">\n' +
    '                <div>\n' +
    '                    <div style="font-size: 0.8rem; color: var(--text-muted);">رصيد المحفظة الحالي</div>\n' +
    '                    <div style="font-size: 1.4rem; font-weight: bold; color: var(--gold-light);" id="user-gems">💎 2,500 ماسة</div>\n' +
    '                </div>\n' +
    '                <button class="btn-gold" style="padding: 8px 14px; font-size: 0.85rem;" onclick="rechargeGems()">💳 شحن رصيد</button>\n' +
    '            </div>\n' +
    '\n' +
    '            <!-- لوحة مستويات VIP -->\n' +
    '            <div class="section-header"><h2 class="section-title">👑 مستويات الهلباوى VIP</h2></div>\n' +
    '            <div class="vip-badge-card" style="border-color: var(--gold-primary);">\n' +
    '                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">\n' +
    '                    <span style="font-weight: bold; color: var(--gold-light);">LEVEL 01 👑 VIP 1 (مشترك حالياً)</span>\n' +
    '                    <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.2); color: var(--success); padding: 3px 8px; border-radius: 6px;">مفعل</span>\n' +
    '                </div>\n' +
    '                <div style="font-size: 0.82rem; color: var(--text-muted);">شارة المشرف الملكية • أولوية التحدث بالبث • إطار ذهبي مميز.</div>\n' +
    '            </div>\n' +
    '\n' +
    '            <div class="vip-badge-card">\n' +
    '                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">\n' +
    '                    <span style="font-weight: bold; color: var(--gold-light);">LEVEL 02 👑 VIP 2 الملكي</span>\n' +
    '                    <span style="font-size: 0.8rem; color: var(--gold-primary);">500 ماسة / شهر</span>\n' +
    '                </div>\n' +
    '                <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 10px;">مقعد خاص دائم في الغرفة • تأثيرات دخول مرئية • هدايا مجانية يومية.</div>\n' +
    '                <button class="btn-gold" style="width: 100%; font-size: 0.85rem; padding: 8px;" onclick="upgradeVip(2, 500)">ترقية إلى VIP 2</button>\n' +
    '            </div>\n' +
    '\n' +
    '            <div class="vip-badge-card">\n' +
    '                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">\n' +
    '                    <span style="font-weight: bold; color: var(--gold-light);">LEVEL 03 👑 VIP الإمبراطوري</span>\n' +
    '                    <span style="font-size: 0.8rem; color: var(--gold-primary);">1500 ماسة / شهر</span>\n' +
    '                </div>\n' +
    '                <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 10px;">تحكم كامل بالغرف • صلاحيات إدارية عليا • لقب خاص مميز في الشات.</div>\n' +
    '                <button class="btn-gold" style="width: 100%; font-size: 0.85rem; padding: 8px;" onclick="upgradeVip(3, 1500)">ترقية إلى VIP الإمبراطوري</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '    <nav class="bottom-nav">\n' +
    '        <button class="nav-item active" onclick="switchTab(\'home\', this)"><span style="font-size:1.1rem">🏠</span> غرفة</button>\n' +
    '        <button class="nav-item" onclick="switchTab(\'activity\', this)"><span style="font-size:1.1rem">📊</span> نشاط</button>\n' +
    '        <button class="nav-item" onclick="switchTab(\'messages\', this)"><span style="font-size:1.1rem">💬</span> رسائل</button>\n' +
    '        <button class="nav-item" onclick="switchTab(\'profile\', this)"><span style="font-size:1.1rem">👤</span> أنا</button>\n' +
    '    </nav>\n' +
    '    <script>\n' +
    '        let userGems = 2500;\n' +
    '        let isMicOpen = true;\n' +
    '        let mediaStream = null;\n' +
    '        let isCamOn = false;\n' +
    '\n' +
    '        function switchTab(tabName, el) {\n' +
    '            document.querySelectorAll(\'.section-view\').forEach(v => v.classList.remove(\'active\'));\n' +
    '            document.getElementById(\'view-\' + tabName).classList.add(\'active\');\n' +
    '            document.querySelectorAll(\'.nav-item\').forEach(i => i.classList.remove(\'active\'));\n' +
    '            if(el) el.classList.add(\'active\');\n' +
    '            window.scrollTo(0, 0);\n' +
    '        }\n' +
    '        function enterLiveRoom() {\n' +
    '            document.querySelectorAll(\'.section-view\').forEach(v => v.classList.remove(\'active\'));\n' +
    '            document.getElementById(\'view-liveroom\').classList.add(\'active\');\n' +
    '            window.scrollTo(0, 0);\n' +
    '        }\n' +
    '        function toggleMic() {\n' +
    '            isMicOpen = !isMicOpen;\n' +
    '            let micBtn = document.getElementById(\'mic-toggle-btn\');\n' +
    '            let statusText = document.getElementById(\'room-status-text\');\n' +
    '            if(isMicOpen) {\n' +
    '                micBtn.innerHTML = \'🎙️ قفل المايك\';\n' +
    '                statusText.innerHTML = \'● المايك مفتوح ومتصل بالبث\';\n' +
    '                statusText.style.color = \'var(--success)\';\n' +
    '            } else {\n' +
    '                micBtn.innerHTML = \'🎙️ فتح المايك\';\n' +
    '                statusText.innerHTML = \'🔇 المايك مقفل\';\n' +
    '                statusText.style.color = \'var(--danger)\';\n' +
    '            }\n' +
    '        }\n' +
    '        async function toggleCamera() {\n' +
    '            let camBtn = document.getElementById(\'cam-toggle-btn\');\n' +
    '            let videoEl = document.getElementById(\'webcamVideo\');\n' +
    '            let placeholder = document.getElementById(\'cam-placeholder\');\n' +
    '            if (!isCamOn) {\n' +
    '                try {\n' +
    '                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });\n' +
    '                    videoEl.srcObject = mediaStream;\n' +
    '                    videoEl.style.display = \'block\';\n' +
    '                    placeholder.style.display = \'none\';\n' +
    '                    camBtn.innerHTML = \'📹 إغلاق الكاميرا\';\n' +
    '                    camBtn.style.borderColor = \'var(--danger)\';\n' +
    '                    camBtn.style.color = \'var(--danger)\';\n' +
    '                    isCamOn = true;\n' +
    '                } catch (err) {\n' +
    '                    alert("تعذر الوصول للكاميرا.");\n' +
    '                }\n' +
    '            } else {\n' +
    '                if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());\n' +
    '                videoEl.style.display = \'none\';\n' +
    '                placeholder.style.display = \'flex\';\n' +
    '                    camBtn.innerHTML = \'📹 فتح الكاميرا\';\n' +
    '                camBtn.style.borderColor = \'var(--gold-primary)\';\n' +
    '                camBtn.style.color = \'var(--gold-light)\';\n' +
    '                isCamOn = false;\n' +
    '            }\n' +
    '        }\n' +
    '        function toggleGiftsModal() {\n' +
    '            let modal = document.getElementById(\'gifts-modal\');\n' +
    '            modal.style.display = (modal.style.display === \'block\') ? \'none\' : \'block\';\n' +
    '        }\n' +
    '        function sendGift(giftName, cost) {\n' +
    '            if (userGems < cost) {\n' +
    '                alert("رصيد الماس غير كافي! قم بالشحن من تبويب أنا.");\n' +
    '                return;\n' +
    '            }\n' +
    '            userGems -= cost;\n' +
    '            document.getElementById(\'user-gems\').innerHTML = `💎 ${userGems.toLocaleString()} ماسة`;\n' +
    '            toggleGiftsModal();\n' +
    '            let ann = document.getElementById(\'gift-announcement\');\n' +
    '            ann.innerHTML = `🎁 قمت بإرسال (${giftName}) بنجاح!`;\n' +
    '            ann.style.display = \'block\';\n' +
    '            setTimeout(() => { ann.style.display = \'none\'; }, 3500);\n' +
    '        }\n' +
    '        function rechargeGems() {\n' +
    '            userGems += 1000;\n' +
    '            document.getElementById(\'user-gems\').innerHTML = `💎 ${userGems.toLocaleString()} ماسة`;\n' +
    '            alert("تم شحن 1000 ماسة بنجاح إلى محفظتك الملكية!");\n' +
    '        }\n' +
    '        function upgradeVip(level, cost) {\n' +
    '            if (userGems < cost) {\n' +
    '                alert("رصيد الماس غير كافي للترقية!");\n' +
    '                return;\n' +
    '            }\n' +
    '            userGems -= cost;\n' +
    '            document.getElementById(\'user-gems\').innerHTML = `💎 ${userGems.toLocaleString()} ماسة`;\n' +
    '            alert(`مبروك! تمت ترقيتك بنجاح إلى مستوى VIP ${level}`);\n' +
    '        }\n' +
    '        function sendChatMessage() {\n' +
    '            let input = document.getElementById(\'chatInput\');\n' +
    '            let text = input.value.trim();\n' +
    '            if(text !== "") {\n' +
    '                let chatBox = document.getElementById(\'chat-messages-box\');\n' +
    '                let bubble = document.createElement(\'div\');\n' +
    '                bubble.className = \'chat-bubble mine\';\n' +
    '                bubble.innerHTML = \'<div class="chat-sender">👑 عطيه (أنت)</div><div>\' + text + \'</div>\';\n' +
    '                chatBox.appendChild(bubble);\n' +
    '                input.value = "";\n' +
    '                chatBox.scrollTop = chatBox.scrollHeight;\n' +
    '            }\n' +
    '        }\n' +
    '    </script>\n' +
    '</body>\n' +
    '</html>';
    res.send(htmlContent);
});

app.listen(PORT, () => {
    console.log('👑 تم تحديث المحفظة ومستويات VIP بنجاح على: http://localhost:' + PORT);
});
