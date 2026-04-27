const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:admin2010@cluster0.mongodb.net/pubgm_final?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("🔥 DB CONNECTED")).catch(err => console.log(err));

// --- USER MODEL ---
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    balance: { type: Number, default: 1000 },
    inventory: Array,
    history: { coin: Array, uc: Array }
}));

app.use(express.json());

// --- ITEMS DATABASE (25+ Keys Logic) ---
const ITEMS_POOL = {
    "Pharaoh X-Suit": { color: "#ff3e3e", items: [
        { name: "Pharaoh X-Suit (Lvl 7)", rarity: "ultimate", price: 2000, img: "https://i.ibb.co/L6vV7xV/pharaoh.png" },
        { name: "M24 Seven Seas", rarity: "mythic_gun", price: 700, img: "https://i.ibb.co/pW6z6Gq/box.png" },
        { name: "Silver", rarity: "common", price: 1, img: "https://i.ibb.co/mS5Tz5k/silver.png" }
    ]},
    "Poseidon X-Suit": { color: "#00d4ff", items: [
        { name: "Poseidon X-Suit", rarity: "ultimate", price: 2000, img: "https://i.ibb.co/hK8XwzN/poseidon.png" },
        { name: "M16A4 Blood", rarity: "mythic_gun", price: 700, img: "https://i.ibb.co/pW6z6Gq/box.png" },
        { name: "Silver", rarity: "common", price: 1, img: "https://i.ibb.co/mS5Tz5k/silver.png" }
    ]}
};
// 25+ keys uchun avtomatik generatsiya
["Silvanus", "Avalanche", "Fiore", "Marmoris", "Galadria", "Stygian", "Ignis", "Arcane", "Irradiance", "Classic 1", "Classic 2", "Classic 3", "Premium 1", "Premium 2", "Supply 1", "Supply 2", "Mummy", "Golden Pharaoh", "Jester", "Godzilla", "Kong", "Spider-Man", "Dragon Ball"].forEach(n => {
    ITEMS_POOL[n] = ITEMS_POOL["Pharaoh X-Suit"]; 
});

// --- API ROUTES ---

// Admin: Pul tushurish (Fixed)
app.post('/api/admin/add', async (req, res) => {
    const { targetId, amount } = req.body;
    try {
        const user = await User.findOneAndUpdate({ userId: targetId }, { $inc: { balance: parseInt(amount) } }, { new: true });
        if (user) res.json({ success: true, newBalance: user.balance });
        else res.json({ success: false, message: "Foydalanuvchi topilmadi!" });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/user', async (req, res) => {
    let user = await User.findOne({ userId: req.body.userId });
    if (!user) user = await User.create({ userId: req.body.userId });
    res.json(user);
});

app.post('/api/open', async (req, res) => {
    const { userId, caseName, count } = req.body;
    const user = await User.findOne({ userId });
    const cost = count * 70;
    if (user.balance < cost) return res.json({ error: "Mablag' yetarli emas!" });

    let rewards = [];
    const pool = ITEMS_POOL[caseName].items;

    for (let i = 0; i < count; i++) {
        let rand = Math.random() * 100;
        if (rand < 0.4) rewards.push(pool[0]); // Ultimate
        else if (rand < 15.4) rewards.push(pool[1]); // Mythic
        else rewards.push(pool[pool.length-1]); // Silver
    }

    user.balance -= cost;
    user.inventory.push(...rewards);
    await user.save();
    res.json({ rewards, balance: user.balance });
});

app.post('/api/convert-uc', async (req, res) => {
    const { userId, amount, promo } = req.body;
    let cost = amount * 50; // Masalan 60UC * 50 = 3000 Fx
    if (promo === "rudi") cost -= 500;
    const user = await User.findOne({ userId });
    if (user.balance < cost) return res.json({ error: "Fx yetarli emas!" });
    user.balance -= cost;
    const code = "PUBG-" + Math.random().toString(36).toUpperCase().substr(2, 9);
    user.history.uc.unshift({ code, amount, date: new Date().toLocaleTimeString() });
    await user.save();
    res.json({ success: true, code, balance: user.balance });
});

// --- UI (HTML/CSS/JS) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>PUBGM Buldrop Simulator</title>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --dark: #0d0d0d; --ultimate: #ff3e3e; --mythic: #ff00ff; }
        body { background: var(--dark); color: white; font-family: 'Rajdhani', sans-serif; margin: 0; display: flex; height: 100vh; overflow: hidden; }
        
        /* Sidebar Terminal */
        .sidebar { width: 300px; background: #000; border-right: 1px solid var(--gold); display: flex; flex-direction: column; padding: 20px; }
        .menu-btn { width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; color: #aaa; cursor: pointer; margin-bottom: 10px; border-radius: 5px; font-weight: bold; }
        .menu-btn:hover { border-color: var(--gold); color: white; }
        
        /* Main Area */
        .main { flex: 1; overflow-y: auto; padding: 30px; position: relative; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .balance-card { background: linear-gradient(90deg, #1a1a1a, #000); padding: 10px 25px; border-radius: 50px; border: 1px solid var(--gold); box-shadow: 0 0 15px rgba(212,175,55,0.2); }

        /* Grid */
        .case-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
        .case-card { background: #111; border: 1px solid #222; border-radius: 10px; padding: 15px; text-align: center; transition: 0.3s; cursor: pointer; }
        .case-card:hover { transform: scale(1.05); border-color: var(--gold); }
        .case-card img { width: 120px; height: 120px; object-fit: contain; }

        /* Buldrop Opening Animation */
        #opening-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:1000; align-items:center; justify-content:center; flex-direction:column; }
        .spinner-container { width: 80%; height: 150px; background: #111; border: 2px solid var(--gold); position: relative; overflow: hidden; display: flex; align-items: center; }
        .spinner-rail { display: flex; position: absolute; left: 0; transition: transform 4s cubic-bezier(0.1, 0, 0.1, 1); }
        .spinner-item { min-width: 150px; height: 150px; border-right: 1px solid #222; display: flex; align-items: center; justify-content: center; background: #1a1a1a; }
        .spinner-item img { width: 80px; }
        .marker { position: absolute; left: 50%; top: 0; bottom: 0; width: 4px; background: var(--gold); z-index: 5; box-shadow: 0 0 15px var(--gold); }

        /* Custom Notification (Buldrop Style) */
        #notif-container { position: fixed; top: 20px; right: 20px; z-index: 9999; }
        .notif { background: #111; border-left: 5px solid var(--gold); color: white; padding: 15px 25px; margin-bottom: 10px; border-radius: 4px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); animation: slideIn 0.3s forwards; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        /* Rarity Borders */
        .ultimate-border { border-bottom: 4px solid var(--ultimate) !important; }
        .mythic-border { border-bottom: 4px solid var(--mythic) !important; }
    </style>
</head>
<body>

    <div id="notif-container"></div>

    <div class="sidebar">
        <div style="color: var(--gold); font-size: 24px; margin-bottom: 30px;">PUBGM MOD</div>
        
        <p style="font-size: 12px; color: #555;">ID: <span id="user-id">...</span></p>

        <div style="margin-bottom: 20px;">
            <span style="color:var(--gold)">UC ALMASHISH</span>
            <select id="uc-val" class="menu-btn" style="background:#000; border-color:var(--gold)">
                <option value="60">60 UC (3000 Fx)</option>
                <option value="120">120 UC (6000 Fx)</option>
                <option value="360">360 UC (18000 Fx)</option>
            </select>
            <input type="text" id="promo" placeholder="Promokod" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:white; margin-bottom:10px;">
            <button class="menu-btn" onclick="buyUC()" style="background:var(--gold); color:black">UC SOTIB OLISH</button>
        </div>

        <button class="menu-btn" onclick="showInventory()">🎒 INVENTAR</button>
        <button class="menu-btn" onclick="window.location.href='/admin'">⚙️ ADMIN PANEL</button>
        
        <div style="margin-top:auto">
            <span style="color:var(--gold); font-size:12px">TARIX</span>
            <div id="history" style="height:150px; overflow-y:auto; font-size:11px; background:#050505; padding:5px;"></div>
        </div>
    </div>

    <div class="main">
        <div class="header">
            <h2 id="page-title">KEYS MARKAZI</h2>
            <div class="balance-card">
                <span style="color:var(--gold); font-weight:bold">Fx</span> <span id="balance">0</span>
            </div>
        </div>

        <div class="case-grid" id="case-grid"></div>
    </div>

    <div id="opening-overlay">
        <h1 id="spin-status" style="color:var(--gold)">OCHILMOQDA...</h1>
        <div class="spinner-container">
            <div class="marker"></div>
            <div class="spinner-rail" id="spinner-rail"></div>
        </div>
        <div id="result-display" style="margin-top:30px; display:flex; gap:10px;"></div>
        <button class="menu-btn" style="width:200px; margin-top:20px;" onclick="closeOpening()">YOPISH</button>
    </div>

    <script>
        let userId = localStorage.getItem('p_uid') || 'ID' + Math.floor(Math.random()*999999);
        localStorage.setItem('p_uid', userId);
        document.getElementById('user-id').innerText = userId;

        async function refresh() {
            const res = await fetch('/api/user', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId }) });
            const data = await res.json();
            document.getElementById('balance').innerText = data.balance;
            document.getElementById('history').innerHTML = data.history.uc.map(u => \`<div style="border-bottom:1px solid #222; padding:3px; color:#00ff41">[\${u.date}] \${u.amount}UC: \${u.code}</div>\`).join('');
        }

        function showNotif(msg) {
            const n = document.createElement('div'); n.className = 'notif'; n.innerText = msg;
            document.getElementById('notif-container').appendChild(n);
            setTimeout(() => n.remove(), 4000);
        }

        function renderCases() {
            const grid = document.getElementById('case-grid');
            const list = ${JSON.stringify(Object.keys(ITEMS_POOL))};
            grid.innerHTML = list.map(c => \`
                <div class="case-card" onclick="startSpin('\${c}')">
                    <img src="https://i.ibb.co/pW6z6Gq/box.png">
                    <div style="font-weight:bold; margin-top:10px">\${c}</div>
                    <div style="color:var(--gold)">70 Fx</div>
                </div>
            \`).join('');
        }

        async function startSpin(caseName) {
            const res = await fetch('/api/open', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId, caseName, count: 1 }) });
            const data = await res.json();
            if(data.error) return showNotif(data.error);

            const overlay = document.getElementById('opening-overlay');
            const rail = document.getElementById('spinner-rail');
            overlay.style.display = 'flex';
            rail.style.transform = 'translateX(0px)';
            rail.innerHTML = '';

            // 50ta tasodifiy rasm spinner uchun
            for(let i=0; i<50; i++) {
                rail.innerHTML += \`<div class="spinner-item"><img src="https://i.ibb.co/mS5Tz5k/silver.png"></div>\`;
            }
            // Oxirgi yutuq rasmini 45-chi joyga qo'yamiz
            rail.children[44].innerHTML = \`<img src="\${data.rewards[0].img}">\`;
            rail.children[44].className += ' ' + (data.rewards[0].rarity === 'ultimate' ? 'ultimate-border' : 'mythic-border');

            setTimeout(() => {
                rail.style.transform = 'translateX(-' + (44 * 150 - (window.innerWidth*0.4)) + 'px)';
            }, 100);

            setTimeout(() => {
                showNotif("Tabriklaymiz! " + data.rewards[0].name + " tushdi!");
                refresh();
            }, 4500);
        }

        async function buyUC() {
            const amount = document.getElementById('uc-val').value;
            const promo = document.getElementById('promo').value;
            const res = await fetch('/api/convert-uc', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId, amount, promo }) });
            const data = await res.json();
            if(data.error) showNotif(data.error);
            else { showNotif("Xarid muvaffaqiyatli! Kod tarixda."); refresh(); }
        }

        async function showInventory() {
            const res = await fetch('/api/user', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId }) });
            const user = await res.json();
            document.getElementById('page-title').innerText = "🎒 INVENTAR";
            const grid = document.getElementById('case-grid');
            grid.innerHTML = user.inventory.map((item, i) => \`
                <div class="case-card">
                    <img src="\${item.img}">
                    <div>\${item.name}</div>
                    <button class="menu-btn" style="color:var(--gold)" onclick="sell(\${i})">SOTISH (\${item.price} Fx)</button>
                </div>
            \`).join('');
        }

        function closeOpening() { document.getElementById('opening-overlay').style.display='none'; }
        
        renderCases();
        refresh();
    </script>
</body>
</html>
    `);
});

// --- ADMIN PAGE ---
app.get('/admin', (req, res) => {
    res.send(`
        <body style="background:#000; color:gold; font-family:sans-serif; padding:50px; text-align:center;">
            <h2>ADMIN PANEL (FxCoin To'ldirish)</h2>
            <input id="tid" placeholder="Foydalanuvchi ID (masalan: ID123456)" style="padding:10px; width:300px; margin:10px;"> <br>
            <input id="amt" type="number" placeholder="Miqdori (Fx)" style="padding:10px; width:300px; margin:10px;"> <br>
            <button onclick="send()" style="padding:10px 30px; background:gold; border:none; cursor:pointer; font-weight:bold;">BALANSGA QO'SHISH</button>
            <p id="msg"></p>
            <script>
                async function send() {
                    const res = await fetch('/api/admin/add', {
                        method: 'POST',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ targetId: document.getElementById('tid').value, amount: document.getElementById('amt').value })
                    });
                    const data = await res.json();
                    document.getElementById('msg').innerText = data.success ? "Muvaffaqiyatli! Yangi balans: " + data.newBalance : data.message;
                }
            </script>
        </body>
    `);
});

app.listen(PORT, () => console.log(\`Server: http://localhost:\${PORT}\`));
