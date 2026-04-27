const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Baza bog'landi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

// 2. MODELLAR
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 100 },
    history: { type: Array, default: [] }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    code: String,
    userId: String,
    ucAmount: Number,
    type: String, // 'UC' yoki 'COIN_TOPUP'
    status: { type: String, default: 'Kutilmoqda' },
    date: { type: Date, default: Date.now }
}));

// 3. API YO'LLARI
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 100 });
    res.json(user);
});

app.post('/api/admin/add-coin', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
    res.json({ success: true, balance: user.fxCoin });
});

app.get('/api/admin/orders', async (req, res) => {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
});

app.post('/api/user/exchange', async (req, res) => {
    let { userId, amount, uc, promo } = req.body;
    if (promo === "rudi") amount -= 500;
    
    const user = await User.findOne({ userId });
    if (user.fxCoin < amount) return res.status(400).json({ message: "Mablag' yetarli emas" });
    
    const code = "FX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: -amount } });
    await Order.create({ code, userId, ucAmount: uc, type: 'UC' });
    res.json({ success: true, code });
});

app.post('/api/user/update-balance', async (req, res) => {
    const { userId, amount, log } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount }, $push: { history: { text: log, date: new Date() } } }, { new: true });
    res.json(user);
});

// 4. ADMIN PANEL (SIDEBAR DIZAYN)
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>FX-ADMIN | TERMINAL</title>
    <style>
        body { background: #050608; color: #00ff00; font-family: 'Courier New', monospace; margin: 0; display: flex; height: 100vh; }
        .sidebar { width: 250px; background: #0a0b10; border-right: 1px solid #1a1c24; padding: 20px; }
        .content { flex: 1; padding: 30px; overflow-y: auto; }
        .nav-btn { display: block; width: 100%; padding: 12px; margin-bottom: 10px; background: #15171f; border: 1px solid #333; color: #00ff00; text-align: left; cursor: pointer; }
        .nav-btn:hover { background: #1a1c24; border-color: #00ff00; }
        .card { background: #0a0b10; border: 1px solid #00ff00; padding: 20px; border-radius: 5px; }
        input { background: #000; border: 1px solid #00ff00; color: #00ff00; padding: 10px; width: 100%; margin-bottom: 10px; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #1a1c24; padding: 8px; text-align: left; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h3>FX-TERMINAL v2.0</h3>
        <button class="nav-btn" onclick="show('orders')">💎 UC XARIDLAR</button>
        <button class="nav-btn" onclick="show('topup')">💰 COIN TUSHURISH</button>
        <button class="nav-btn" onclick="show('history')">📜 TARIX</button>
    </div>
    <div class="content">
        <div id="login" class="card" style="width:300px; margin: 100px auto;">
            <h2>ENTER PASS</h2>
            <input type="password" id="pw">
            <button class="nav-btn" onclick="if(document.getElementById('pw').value=='2010') document.getElementById('login').style.display='none'">LOGIN</button>
        </div>

        <div id="section-topup" class="section">
            <h2>💰 FXCOIN TUSHURISH XIZMATI</h2>
            <div class="card">
                <input type="text" id="t-uid" placeholder="Foydalanuvchi ID">
                <input type="number" id="t-amt" placeholder="Miqdor">
                <button class="nav-btn" onclick="sendCoin()">TUSHURISH</button>
            </div>
        </div>

        <div id="section-orders" class="section" style="display:none">
            <h2>💎 UC XARID QILGANLAR</h2>
            <table id="orderTable"><thead><tr><th>User ID</th><th>KOD</th><th>UC</th><th>Holat</th></tr></thead><tbody></tbody></table>
        </div>
    </div>
    <script>
        function show(id) {
            document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
            document.getElementById('section-' + id).style.display = 'block';
            if(id === 'orders') loadOrders();
        }
        async function loadOrders() {
            const res = await fetch('/api/admin/orders');
            const data = await res.json();
            const tbody = document.querySelector('#orderTable tbody');
            tbody.innerHTML = data.map(o => \`<tr><td>\${o.userId}</td><td>\${o.code}</td><td>\${o.ucAmount}</td><td>\${o.status}</td></tr>\`).join('');
        }
        async function sendCoin() {
            const res = await fetch('/api/admin/add-coin', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: document.getElementById('t-uid').value, amount: document.getElementById('t-amt').value })
            });
            alert("Bajarildi!");
        }
    </script>
</body>
</html>`);
});

// 5. ASOSIY BULLDROP SAHIFASI
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT | BULLDROP</title>
    <style>
        :root { --gold: #f57c00; --bg: #050608; --card: #0d0e14; }
        body { background: var(--bg); color: white; font-family: 'Segoe UI', sans-serif; margin: 0; }
        header { background: #0a0b10; padding: 15px 5%; display: flex; justify-content: space-between; border-bottom: 1px solid #1a1c24; position: sticky; top:0; z-index: 100; }
        .balance { border: 1px solid var(--gold); padding: 5px 15px; border-radius: 20px; color: var(--gold); font-weight: bold; }
        .container { padding: 30px 5%; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .case { background: var(--card); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #1a1c24; cursor: pointer; transition: 0.3s; }
        .case:hover { border-color: var(--gold); transform: translateY(-5px); }
        .case img { width: 100%; height: 160px; object-fit: contain; }
        .btn-box { display: flex; gap: 5px; margin-top: 10px; }
        .btn { flex: 1; padding: 8px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .btn-1 { background: var(--gold); color: black; }
        .btn-10 { background: #333; color: white; }
        
        .exchange-box { margin: 20px 5%; background: var(--card); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #1a1c24; }
        select, input { padding: 10px; background: #000; border: 1px solid #333; color: white; border-radius: 5px; margin: 5px; }
        
        #modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 1000; justify-content: center; align-items: center; flex-direction: column; }
        .win-card { text-align: center; }
        .win-img { width: 280px; filter: drop-shadow(0 0 20px var(--gold)); }
    </style>
</head>
<body>
    <header>
        <div style="font-size: 24px; font-weight: bold; color: var(--gold);">FX-LOOT</div>
        <div style="display:flex; gap:15px; align-items:center;">
            <div id="uIdDisp" style="color:#555; font-size:12px;">ID: ...</div>
            <div class="balance">💰 <span id="balDisp">0</span> Fx</div>
        </div>
    </header>

    <div class="container" id="caseList"></div>

    <div class="exchange-box">
        <h3 style="color:var(--gold)">💎 UC XARID QILISH</h3>
        <select id="ucSelect">
            <option value="3000|60">60 UC - 3000 Fx</option>
            <option value="6000|120">120 UC - 6000 Fx</option>
            <option value="18000|360">360 UC - 18000 Fx</option>
        </select>
        <input type="text" id="promo" placeholder="Promokod">
        <button class="btn btn-1" style="width:auto; padding: 10px 30px;" onclick="exchange()">AYLANTIRISH</button>
    </div>

    <div id="modal">
        <div id="winContent" class="win-card">
            <h1 id="winRarity" style="font-style:italic;">ULTIMATE!</h1>
            <img id="winImg" class="win-img" src="">
            <h2 id="winName">Item Name</h2>
            <button class="btn btn-1" id="sellBtn" style="width:250px; padding: 15px;">SOTISH (0 Fx)</button>
            <button class="btn" style="margin-top:10px; background:none; color:#777" onclick="document.getElementById('modal').style.display='none'">YOPISH</button>
        </div>
    </div>

    <script>
        let myId = localStorage.getItem('fxUserId') || "USER_" + Math.floor(Math.random()*9999);
        localStorage.setItem('fxUserId', myId);
        let myBalance = 0;
        let lastWin = null;

        const ITEMS = [
            { name: "Pharaoh X-Suit", type: "ultimate_x", prob: 0.004, price: 2000, img: "https://i.ibb.co/hR0fH8B/poseidon.png" },
            { name: "Ultimate AKM", type: "ultimate_o", prob: 0.004, price: 1000, img: "https://i.ibb.co/YyY2XyF/xsuit-case.png" },
            { name: "M416 Glacier", type: "mythic_a", prob: 0.15, price: 700, img: "https://i.ibb.co/tB7P0WJ/fiend.png" },
            { name: "Mythic Outfit", type: "mythic_o", prob: 0.15, price: 500, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" },
            { name: "L-Gun Skin", type: "leg_a", prob: 0.20, price: 150, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" },
            { name: "L-Suit", type: "leg_o", prob: 0.25, price: 100, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" },
            { name: "Serevro", type: "silver", prob: 0.70, price: 1, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" }
        ];

        const CASES = [
            { name: "Mummy Case", img: "https://i.ibb.co/m0f6pW6/mummy-case.png" },
            { name: "X-Suit Case", img: "https://i.ibb.co/YyY2XyF/xsuit-case.png" },
            { name: "Glacier Case", img: "https://i.ibb.co/YyY2XyF/xsuit-case.png" }
        ];

        async function load() {
            document.getElementById('uIdDisp').innerText = "ID: " + myId;
            const res = await fetch('/api/user/' + myId);
            const user = await res.json();
            myBalance = user.fxCoin;
            updateUI();
            renderCases();
        }

        function updateUI() { document.getElementById('balDisp').innerText = myBalance; }

        function renderCases() {
            const list = document.getElementById('caseList');
            CASES.forEach((c, i) => {
                list.innerHTML += \`
                <div class="case">
                    <img src="\${c.img}">
                    <h3>\${c.name}</h3>
                    <div class="btn-box">
                        <button class="btn btn-1" onclick="openCase(1)">70 Fx</button>
                        <button class="btn btn-10" onclick="openCase(10)">10x 700 Fx</button>
                    </div>
                </div>\`;
            });
        }

        async function openCase(count) {
            let cost = count * 70;
            if(myBalance < cost) return alert("Coin yetarli emas!");
            
            myBalance -= cost;
            updateUI();
            
            // Random logic with probabilities
            let results = [];
            for(let i=0; i<count; i++) {
                let r = Math.random();
                let win;
                if(r <= 0.004) win = ITEMS[0]; // Ultimate
                else if(r <= 0.15) win = ITEMS[2]; // Mythic
                else if(r <= 0.20) win = ITEMS[4]; // Legend A
                else if(r <= 0.25) win = ITEMS[5]; // Legend O
                else win = ITEMS[6]; // Silver
                results.push(win);
            }

            lastWin = results[0]; // For 1x simplify
            showWin(lastWin);
        }

        function showWin(win) {
            const modal = document.getElementById('modal');
            const rarity = document.getElementById('winRarity');
            rarity.innerText = win.type.toUpperCase();
            rarity.style.color = win.price >= 1000 ? "#ff00ff" : (win.price >= 500 ? "red" : "orange");
            
            document.getElementById('winImg').src = win.img;
            document.getElementById('winName').innerText = win.name;
            const sBtn = document.getElementById('sellBtn');
            sBtn.innerText = "SOTISH (" + win.price + " Fx)";
            sBtn.onclick = () => sell(win.price, win.name);
            modal.style.display = 'flex';
        }

        async function sell(price, name) {
            myBalance += price;
            updateUI();
            await fetch('/api/user/update-balance', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: myId, amount: price, log: name + " sotildi" })
            });
            document.getElementById('modal').style.display = 'none';
        }

        async function exchange() {
            const val = document.getElementById('ucSelect').value.split('|');
            const promo = document.getElementById('promo').value;
            const res = await fetch('/api/user/exchange', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: myId, amount: parseInt(val[0]), uc: parseInt(val[1]), promo: promo })
            });
            const data = await res.json();
            if(data.success) alert("Xarid bajarildi! KOD: " + data.code);
            else alert("Xatolik!");
            location.reload();
        }

        load();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 TERMINAL READY"));
