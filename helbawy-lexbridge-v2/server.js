const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>الهلباوي LexBridge — المنصة الاجتماعية المباشرة</title>
    <style>
        :root {
            --bg-color: #080b12;
            --card-bg: #111827;
            --gold-primary: #d4af37;
            --gold-light: #f3e5ab;
            --gold-dark: #aa8c2c;
            --text-main: #f9fafb;
            --text-muted: #9ca3af;
            --border-gold: rgba(212, 175, 55, 0.3);
            --danger: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; padding-bottom: 90px; }
        .royal-header { background: linear-gradient(135deg, #1a1500, #080b12); border-bottom: 2px solid var(--gold-primary); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }
        .brand-title { font-size: 1.1rem; font-weight: bold; color: var(--gold-light); }
        .user-welcome { font-size: 0.85rem; color: var(--text-muted); text-align: left; }
        .user-welcome span { color: var(--gold-primary); font-weight: bold; display: block; }
        
        .container { padding: 16px; max-width: 900px; margin: 0 auto; }
        .section-view { display: none; }
        .section-view.active { display: block; }
        
        .hero-banner { background: linear-gradient(135deg, #111827, #1f2937); border: 1px solid var(--border-gold); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
        .btn-gold { background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary)); color: #000; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; font-size: 0.95rem; }
        .btn-outline { background: transparent; border: 1px solid var(--gold-primary); color: var(--gold-light); padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; }
        
        .section-header { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 12px 0; }
        .section-title { font-size: 1.05rem; color: var(--gold-primary); border-right: 3px solid var(--gold-primary); padding-right: 8px; }
        
        .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .room-card { background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 12px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
        
        .vip-container { display: flex; flex-direction: column; gap: 12px; }
        .vip-card { background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 10px; padding: 14px 18px; }
        .vip-level-title { font-size: 1rem; font-weight: bold; color: var(--gold-primary); margin-bottom: 6px; }
        .vip-features { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px; }
        .vip-status-badge { font-size: 0.75rem; background: rgba(212, 175, 55, 0.1); color: var(--gold-light); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-gold); display: inline-block; }

        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #080b12; border-top: 2px solid var(--gold-primary); display: flex; justify-content: space-around; padding: 10px 0; z-index: 1000; }
        .nav-item { background: none; border: none; color: var(--text-muted); font-size: 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
        .nav-item.active { color: var(--gold-primary); }
    </style>
</head>
<body>
    <header class="royal-header">
        <div class="brand-title">👑 الهلباوى LexBridge</div>
        <div class="user-welcome">مرحبًا عطيه <span>الحساب: atya</span></div>
    </header>

    <div class="container">
        <!-- الرئيسية -->
        <div id="view-home" class="section-view active">
            <div class="hero-banner">
                <button class="btn-gold" onclick="alert('جاري الدخول إلى غرفتك الخاصة...')">🎙️ دخول غرفتي</button>
                <button class="btn-outline" onclick="loadRooms()">🎙️ الغرف المتاحة</button>
            </div>

            <div class="section-header">
                <h2 class="section-title">📢 إعلانات الغرف والأحداث</h2>
                <button class="btn-outline" style="padding: 4px 10px; font-size: 0.8rem;" onclick="location.reload()">🔄 تحديث</button>
            </div>
            
            <div id="rooms-container" style="background: var(--card-bg); border: 1px solid var(--border-gold); border-radius: 10px; padding: 16px; text-align: center; color: var(--text-muted); margin-bottom: 16px;">
                جاري تحميل الغرف...
            </div>

            <div class="hero-banner">
                <input type="text" id="roomCodeInput" placeholder="أدخل معرف غرفة للدخول إليها" style="background: var(--bg-color); border: 1px solid var(--border-gold); padding: 10px; border-radius: 8px; color: #fff; width: 100%;">
                <button class="btn-gold" onclick="joinRoomByCode()">🚪 دخول بمعرف الغرفة</button>
            </div>
        </div>

        <!-- الغرف -->
        <div id="view-rooms" class="section-view">
            <div class="section-header"><h2 class="section-title">🎙️ الغرف المتاحة حالياً</h2></div>
            <div class="rooms-grid">
                <div class="room-card">
                    <div style="font-weight: bold; font-size: 1.05rem; margin-bottom: 6px;">غرفة الهلباوي الرئيسية</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">👥 الحالة: مباشر • 🔓 مفتوحة</div>
                    <button class="btn-gold" style="width: 100%; padding: 6px;" onclick="alert('جاري الدخول...')">دخول الغرفة</button>
                </div>
            </div>
        </div>

        <!-- النشاط -->
        <div id="view-activity" class="section-view">
            <div class="section-header"><h2 class="section-title">🔥 الهلباوى VIP — مميزات جديدة</h2></div>
            <div style="font-size: 0.9rem; color: var(--gold-light); margin-bottom: 14px;">👑 ارتقِ بمستواك وافتح مميزات أكثر وخصص ملفك وإطلالتك داخل المنصة.</div>
            
            <div class="vip-container">
                <div class="vip-card">
                    <div class="vip-level-title">LEVEL 01 👑 VIP 1 - بداية عضوية VIP</div>
                    <div class="vip-features">🏅 شارة VIP • 🖼️ إطار الملف • ✨ دخول مميز • 💬 أولوية اجتماعية</div>
                    <div class="vip-status-badge">VIP LEVEL 1 🔒 حسب حالة العضوية</div>
                </div>
                <div class="vip-card">
                    <div class="vip-level-title">LEVEL 02 👑 VIP 2 - مميزات أقوى</div>
                    <div class="vip-features">💺 مقعد مميز • ✨ تأثير دخول • 🎨 تخصيص متقدم • 👑 شارة مطورة</div>
                    <div class="vip-status-badge">VIP LEVEL 2 🔒 حسب حالة العضوية</div>
                </div>
                <div class="vip-card">
                    <div class="vip-level-title">LEVEL 03 👑 VIP 3 - مستوى اجتماعي متقدم</div>
                    <div class="vip-features">🎁 تأثيرات الهدايا • 🚀 أولوية الغرفة • 🖼️ إطار متقدم • ⭐ شارة مستوى</div>
                    <div class="vip-status-badge">VIP LEVEL 3 🔒 حسب حالة العضوية</div>
                </div>
                <div class="vip-card">
                    <div class="vip-level-title">LEVEL 04 👑 VIP 4 - مستوى مميز</div>
                    <div class="vip-features">🎙️ أدوات غرفة إضافية • ⚡ أولوية أعلى • 🎁 تأثيرات متقدمة • 🏆 شارة خاصة</div>
                    <div class="vip-status-badge">VIP LEVEL 4 🔒 حسب حالة العضوية</div>
                </div>
                <div class="vip-card">
                    <div class="vip-level-title">LEVEL 05 👑 VIP 5 - امتيازات متقدمة</div>
                    <div class="vip-features">💎 هوية مميزة • 🚀 أولوية متقدمة • 🎨 تخصيص متقدم • 🎁 مؤثرات خاصة</div>
                    <div class="vip-status-badge">VIP LEVEL 5 🔒 حسب حالة العضوية</div>
                </div>
                <div class="vip-card">
                    <div class="vip-level-title">LEVEL 06 👑 VIP 6 - أعلى مستوى VIP</div>
                    <div class="vip-features">💎 هوية VIP 6 • ⚡ أعلى أولوية • 🎙️ أدوات حصرية • 🏆 امتيازات عليا</div>
                    <div class="vip-status-badge">VIP LEVEL 6 🔒 حسب حالة العضوية</div>
                </div>
            </div>
        </div>

        <!-- الرسائل -->
        <div id="view-messages" class="section-view">
            <div class="section-header"><h2 class="section-title">💬 الرسائل والإشعارات</h2></div>
            <div style="background: var(--card-bg); border: 1px solid var(--border-gold); padding: 20px; border-radius: 10px; text-align: center; color: var(--text-muted);">
                لا توجد رسائل جديدة في صندوق الوارد.
            </div>
        </div>

        <!-- أنا (الملف الشخصي) -->
        <div id="view-profile" class="section-view">
            <div class="section-header"><h2 class="section-title">👤 الملف الشخصي</h2></div>
            <div style="background: var(--card-bg); border: 1px solid var(--border-gold); padding: 16px; border-radius: 10px;">
                <div style="color: var(--gold-primary); font-weight: bold; margin-bottom: 6px;">عطيه (atya)</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">الحالة: متصل • المستوى الحالي: VIP 1</div>
            </div>
        </div>
    </div>

    <!-- شريط التنقل السفلي -->
    <nav class="bottom-nav">
        <button class="nav-item active" onclick="switchTab('home', this)"><span style="font-size:1.1rem">🏠</span> غرفة</button>
        <button class="nav-item" onclick="switchTab('activity', this)"><span style="font-size:1.1rem">📊</span> نشاط</button>
        <button class="nav-item" onclick="switchTab('messages', this)"><span style="font-size:1.1rem">💬</span> رسائل</button>
        <button class="nav-item" onclick="switchTab('profile', this)"><span style="font-size:1.1rem">👤</span> أنا</button>
    </nav>

    <script>
        function switchTab(tabName, el) {
            document.querySelectorAll('.section-view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-' + tabName).classList.add('active');
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
            window.scrollTo(0, 0);
        }

        function loadRooms() {
            let container = document.getElementById('rooms-container');
            container.innerHTML = \`
                <div style="color: var(--gold-light); font-weight: bold; margin-bottom: 6px;">🎙️ الغرفة العامة النشطة</div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">المشرف: عطيه | متاح للجميع</div>
                <button class="btn-gold" style="padding: 6px 14px; font-size: 0.85rem;" onclick="alert('تم الانضمام للغرفة بنجاح')">دخول مباشر</button>
            \`;
        }

        function joinRoomByCode() {
            let code = document.getElementById('roomCodeInput').value;
            if(code.trim() !== "") {
                alert("جاري الاتصال بالمعرف: " + code);
            } else {
                alert("يرجى إدخال معرف الغرفة أولاً.");
            }
        }

        // تحميل تلقائي للإعلانات والغرف بعد الثواني الأولى
        setTimeout(loadRooms, 800);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log('==================================================');
    console.log(`👑 منصة الهلباوي LexBridge تعمل بالواجهة المطلوبة بدقة!`);
    console.log(`🌐 افتح الرابط في المتصفح: http://localhost:${PORT}`);
    console.log('==================================================');
});
