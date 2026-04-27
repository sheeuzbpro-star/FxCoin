const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:admin2010@cluster0.mongodb.net/pubgm_pro?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("✅ MongoDB Connected")).catch(err => console.log(err));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    balance: { type: Number, default: 1000 },
    inventory: Array,
    history: {
        coin: { type: Array, default: [] },
        uc: { type: Array, default: [] }
    }
});
const User = mongoose.model('User', UserSchema);

app.use(express.json());

// --- GAME DATA (25+ CASES & PROBABILITIES) ---
// Rarity Weights: Ultimate (0.4%), Mythic (15%), Weapon (20%), Legendary (25%), Silver (40% - scaled to fit)
const ITEMS = {
    "Pharaoh X-Suit": { img: "https://i.ibb.co/L6vV7xV/pharaoh.png", items: [
        { name: "Pharaoh X-Suit (Lvl 7)", type: "xsuit", rarity: "ultimate", price: 2000 },
        { name: "M24 Seven Seas", type: "gun", rarity: "mythic", price: 700 },
        { name: "Pharaoh Set", type: "outfit", rarity: "mythic", price: 500 },
        { name: "Golden Pan", type: "item", rarity: "legendary", price: 100 },
        { name: "Silver", type: "currency", rarity: "common", price: 1 }
    ]},
    "Poseidon X-Suit": { img: "https://i.ibb.co/hK8XwzN/poseidon.png", items: [
        { name: "Poseidon X-Suit", type: "xsuit", rarity: "ultimate", price: 2000 },
        { name: "M16A4 Blood & Bones", type: "gun", rarity: "mythic", price: 700 },
        { name: "Silver", type: "currency", rarity: "common", price: 1 }
    ]},
    // ... Boshqa 23 ta keys dinamik ravishda pastda generatsiya qilinadi
};

// 25 ta keysni to'ldirish
const xsuitNames = ["Silvanus", "Avalanche", "Fiore", "Marmoris", "Galadria", "Stygian", "Ignis", "Arcane", "Irradiance"];
xsuitNames.forEach(name => {
    ITEMS[`${name} X-Suit`] = {
        img: "https://i.ibb.co/pW6z6Gq/box.png",
        items: [
            { name: `${name} Suit`, type: "xsuit", rarity: "ultimate", price: 2000 },
            { name: "M416 Glacier", type: "gun", rarity: "mythic", price: 700 },
            { name: "Silver", type: "currency", rarity: "common", price: 1 }
        ]
    };
});
for(let i=1; i<=15; i++) {
    ITEMS[`Classic Case V${i}`] = {
        img: "https://i.ibb.co/pW6z6Gq/box.png",
        items: [
            { name: "M416 Fool", type: "gun", rarity: "mythic", price: 700 },
            { name: "AWM Godzilla", type: "gun", rarity: "mythic", price: 700 },
            { name: "Random Legendary", type: "item", rarity: "legendary", price: 150 },
            { name: "Silver", type: "currency", rarity: "common", price: 1 }
        ]
    };
}

// --- API LOGIC ---

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
    const pool = ITEMS[caseName].items;

    for (let i = 0; i < count; i++) {
        let rand = Math.random() * 100;
        let item;
        if (rand < 0.4) item = pool.find(i => i.rarity === 'ultimate') || pool[0];
        else if (rand < 15.4) item = pool.find(i => i.rarity === 'mythic') || pool[0];
        else if (rand < 35.4) item = pool.find(i => i.type === 'gun') || pool[0];
        else if (rand < 60.4) item = pool.find(i => i.rarity === 'legendary') || pool[0];
        else item = pool.find(i => i.rarity === 'common');
        rewards.push(item);
    }

    user.balance -= cost;
    user.inventory.push(...rewards);
    await user.save();
    res.json({ rewards, balance: user.balance });
});

app.post('/api/convert-uc', async (req, res) => {
    const { userId, amount, promo } = req.body;
    let cost = amount === 60 ? 3000 : amount === 120 ? 6000 : amount === 360 ? 18000 : 30000;
    if (promo === "rudi") cost -= 500;

    const user = await User.findOne({ userId });
    if (user.balance < cost) return res.json({ error: "Fx balans yetarli emas!" });

    user.balance -= cost;
    const ucCode = "PUBG-UC-" + Math.random().toString(36).toUpperCase().substring(2, 12);
    user.history.uc.unshift({ code: ucCode, amount, date: new Date().toLocaleString() });
    await user.save();
    res.json({ success: true, code: ucCode, balance: user.balance });
});

app.post('/api/sell', async (req, res) => {
    const { userId, index } = req.body;
    const user = await User.findOne({ userId });
    const item = user.inventory[index];
    user.balance += item.price;
    user.inventory.splice(index, 1);
    await user.save();
    res.json({ balance: user.balance });
});

// --- FRONTEND ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PUBGM Terminal Simulator</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --dark: #0a0a0a; --green: #00ff41; --red: #ff3e3e; }
        body { background: var(--dark); color: white; font-family: 'Fira Code', monospace; margin: 0; display: flex; height: 100vh; overflow: hidden; }
        
        /* Sidebar Terminal Style */
        .sidebar { width: 320px; background: #000; border-right: 1px solid #333; display: flex; flex-direction: column; padding: 15px; border-right: 2px solid var(--gold); }
        .terminal-header { color: var(--green); font-size: 12px; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 10px; }
        .menu-section { margin-bottom: 25px; }
        .menu-title { color: var(--gold); font-size: 14px; text-transform: uppercase; margin-bottom: 10px; display: block; }
        .btn-side { width: 100%; background: #111; border: 1px solid #333; color: #ccc; padding: 10px; text-align: left; cursor: pointer; margin-bottom: 5px; font-size: 12px; }
        .btn-side:hover { border-color: var(--gold); color: white; }

        /* Main Content */
        .main { flex: 1; overflow-y: auto; padding: 30px; background: radial-gradient(circle at top, #1a1a1a 0%, #0a0a0a 100%); }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        .case-card { background: #111; border: 1px solid #222; padding: 15px; text-align: center; border-radius: 12px; transition: 0.3s; cursor: pointer; }
        .case-card:hover { border-color: var(--gold); transform: translateY(-5px); box-shadow: 0 5px 15px rgba(212,175,55,0.2); }
        .case-card img { width: 100%; height: 150px; object-fit: contain; }
        
        /* History Tizimi */
        .history-tabs { display: flex; gap: 5px; margin-top: 10px; }
        .tab { flex: 1; font-size: 10px; padding: 5px; background: #222; border: none; color: white; cursor: pointer; }
        .tab.active { background: var(--gold); color: black; }
        .history-list { font-size: 11px; height: 150px; overflow-y: auto; background: #050505; padding: 5px; border: 1px solid #222; margin-top: 5px; }

        /* Modal */
        #modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:999; align-items:center; justify-content:center; }
        .modal-box { background:#111; border:2px solid var(--gold); width:80%; max-width:800px; padding:30px; border-radius:20px; text-align:center; }
        .reward-grid { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin:20px 0; }
        .reward-box { width:130px; padding:10px; background:#1a1a1a; border-radius:10px; border-bottom: 4px solid #555; }
        .ultimate { border-color: var(--red) !important; box-shadow: 0 0 15px var(--red); }
        .mythic { border-color: #ff00ff !important; }
        
        .btn-action { background:var(--gold); color:black; border:none; padding:12px 25px; font-weight:bold; cursor:pointer; border-radius:5px; margin:5px; }
        .btn-action:disabled { opacity: 0.5; }

        .uc-select { width: 100%; background: #222; border: 1px solid var(--gold); color: white; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>

    <div class="sidebar">
        <div class="terminal-header">
            > SYSTEM_READY: v4.0.1<br>
            > STATUS: ENCRYPTED<br>
            > WELCOME: <span id="sid-display">...</span>
        </div>

        <div class="menu-section">
            <span class="menu-title">🛒 UC Xarid (Codes)</span>
            <select id="uc-amount" class="uc-select">
                <option value="60">60 UC - 3000 Fx</option>
                <option value="120">120 UC - 6000 Fx</option>
                <option value="360">360 UC - 18000 Fx</option>
                <option value="600">600 UC - 30000 Fx</option>
            </select>
            <input type="text" id="promo-code" placeholder="Promokod" style="width:93%; background:#111; border:1px solid #333; color:white; padding:10px; margin-bottom:5px;">
            <button class="btn-side" onclick="buyUC()">CONVERT TO UC</button>
        </div>

        <div class="menu-section">
            <span class="menu-title">💰 FxCoin Xizmati</span>
            <button class="btn-side" onclick="depositFx()">+ FxCoin Chushirish</button>
            <button class="btn-side" onclick="showInventory()">🎒 Inventar & Sotish</button>
        </div>

        <div class="menu-section" style="flex:1">
            <span class="menu-title">📜 Operatsiyalar Tarixi</span>
            <div class="history-tabs">
                <button class="tab active" onclick="switchTab('coin')">COINS</button>
                <button class="tab" onclick="switchTab('uc')">UC CODES</button>
            </div>
            <div id="history-box" class="history-list"></div>
        </div>
    </div>

    <div class="main">
        <header>
            <div style="font-size:20px; font-weight:bold; color:var(--gold)">FX SIMULATOR</div>
            <div style="display:flex; gap:20px;">
                <div style="background:#222; padding:5px 15px; border-radius:20px; border:1px solid var(--gold)">
                    <span style="color:var(--gold)">Fx</span> <span id="balance">0</span>
                </div>
            </div>
        </header>

        <div id="content-area">
            <h3 style="color:var(--gold)">Barcha Keyslar (25+)</h3>
            <div class="grid" id="case-grid"></div>
        </div>
    </div>

    <div id="modal">
        <div class="modal-box">
            <h2 id="modal-title" style="color:var(--gold)"></h2>
            <div id="reward-display" class="reward-grid"></div>
            <div id="modal-btns">
                <button class="btn-action" onclick="spin(1)">1x OCHISH (70 Fx)</button>
                <button class="btn-action" onclick="spin(10)">10x OCHISH (700 Fx)</button>
                <button class="btn-action" style="background:#444; color:white" onclick="closeModal()">YOPISH</button>
            </div>
        </div>
    </div>

    <script>
        let userId = localStorage.getItem('pubg_uid') || 'U' + Math.floor(Math.random()*999999);
        localStorage.setItem('pubg_uid', userId);
        document.getElementById('sid-display').innerText = userId;
        
        let selectedCase = "";
        let currentTab = 'coin';

        async function loadUser() {
            const res = await fetch('/api/user', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId }) });
            const user = await res.json();
            document.getElementById('balance').innerText = user.balance;
            renderHistory(user);
        }

        function renderCases() {
            const grid = document.getElementById('case-grid');
            const cases = ${JSON.stringify(Object.keys(ITEMS))};
            grid.innerHTML = cases.map(c => \`
                <div class="case-card" onclick="openCaseModal('\${c}')">
                    <img src="https://i.ibb.co/pW6z6Gq/box.png">
                    <div style="margin-top:10px; font-size:12px;">\${c}</div>
                    <div style="color:var(--gold); font-size:11px">70 Fx</div>
                </div>
            \`).join('');
        }

        function openCaseModal(name) {
            selectedCase = name;
            document.getElementById('modal-title').innerText = name;
            document.getElementById('reward-display').innerHTML = '<p style="color:#555">Keys ichida: Ultimate X-Suitlar va Killchat qurollar...</p>';
            document.getElementById('modal').style.display = 'flex';
        }

        async function spin(count) {
            const res = await fetch('/api/open', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId, caseName: selectedCase, count })
            });
            const data = await res.json();
            if(data.error) return alert(data.error);

            document.getElementById('balance').innerText = data.balance;
            const disp = document.getElementById('reward-display');
            disp.innerHTML = '';
            data.rewards.forEach(itm => {
                disp.innerHTML += \`
                    <div class="reward-box \${itm.rarity}">
                        <img src="\${itm.img || 'https://i.ibb.co/mS5Tz5k/silver.png'}" style="width:60px">
                        <div style="font-size:10px; margin-top:5px">\${itm.name}</div>
                    </div>
                \`;
            });
            loadUser();
        }

        async function showInventory() {
            const res = await fetch('/api/user', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId }) });
            const user = await res.json();
            let html = '<h3 style="color:var(--gold)">🎒 Inventar</h3><div class="grid">';
            user.inventory.forEach((itm, i) => {
                html += \`
                    <div class="case-card">
                        <div style="font-size:10px; color:var(--gold)">\${itm.rarity.toUpperCase()}</div>
                        <div>\${itm.name}</div>
                        <button class="btn-action" style="padding:5px; font-size:10px" onclick="sell(\${i})">Sotish: \${itm.price} Fx</button>
                    </div>
                \`;
            });
            html += '</div><button class="btn-action" onclick="location.reload()">ORQAGA</button>';
            document.getElementById('content-area').innerHTML = html;
        }

        async function sell(index) {
            const res = await fetch('/api/sell', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId, index }) });
            const data = await res.json();
            document.getElementById('balance').innerText = data.balance;
            showInventory();
        }

        async function buyUC() {
            const amount = parseInt(document.getElementById('uc-amount').value);
            const promo = document.getElementById('promo-code').value;
            const res = await fetch('/api/convert-uc', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId, amount, promo })
            });
            const data = await res.json();
            if(data.error) alert(data.error);
            else {
                alert("UC Kod olindi: " + data.code);
                loadUser();
            }
        }

        function renderHistory(user) {
            const box = document.getElementById('history-box');
            if(currentTab === 'uc') {
                box.innerHTML = user.history.uc.map(h => \`<div style="color:var(--green); margin-bottom:5px;">[\${h.date}] \${h.amount}UC: \${h.code}</div>\`).join('');
            } else {
                box.innerHTML = '<div style="color:#555">Coin tushurish tarixi bo\\'sh...</div>';
            }
        }

        function switchTab(t) {
            currentTab = t;
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
            event.target.classList.add('active');
            loadUser();
        }

        function closeModal() { document.getElementById('modal').style.display = 'none'; }
        function depositFx() { alert("Tez kunda: Admin panel orqali balans toldiring!"); }

        loadUser();
        renderCases();
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => console.log(`🚀 Terminal Simulator started on port ${PORT}`));
