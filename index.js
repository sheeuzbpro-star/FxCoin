const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Baza bog'landi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

// 2. MODELLAR
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 500 },
    history: { type: Array, default: [] }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    code: String,
    userId: String,
    ucAmount: Number,
    status: { type: String, default: 'Kutilmoqda' },
    date: { type: Date, default: Date.now }
}));

// 3. API YO'LLARI
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 500 });
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
    if (promo === "rudi") amount = Math.max(0, amount - 500);
    const user = await User.findOne({ userId });
    if (!user || user.fxCoin < amount) return res.status(400).json({ message: "No coins" });
    const code = "FX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: -amount } });
    await Order.create({ code, userId, ucAmount: uc });
    res.json({ success: true, code });
});

app.post('/api/user/update-balance', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount } }, { new: true });
    res.json(user);
});

// 4. ADMIN PANEL (TERMINAL)
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>FX-TERMINAL</title>
    <style>
        body { background: #050608; color: #00ff00; font-family: monospace; display: flex; margin: 0; height: 100vh; }
        .sidebar { width: 250px; background: #0a0b10; border-right: 1px solid #1a1c24; padding: 20px; }
        .main { flex: 1; padding: 30px; overflow-y: auto; }
        .nav { display: block; width: 100%; padding: 12px; background: #111; color: #00ff00; border: 1px solid #333; cursor: pointer; margin-bottom: 10px; text-align: left; }
        .nav:hover { background: #00ff00; color: black; }
        .card { background: #0d0e14; border: 1px solid #00ff00; padding: 20px; border-radius: 5px; }
        input { background: #000; border: 1px solid #00ff00; color: #00ff00; padding: 12px; width: 100%; margin-bottom: 10px; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #1a1c24; padding: 10px; text-align: left; }
    </style>
</head>
<body>
    <div id="auth" style="position:fixed; top:0; left:0; width:100%; height:100%; background:#050608; z-index:1000; display:flex; justify-content:center; align-items:center;">
        <div class="card" style="width:300px; text-align:center;">
            <h2>ADMIN LOGIN</h2>
            <input type="password" id="pass" placeholder="Password">
            <button class="nav" style="text-align:center" onclick="if(document.getElementById('pass').value==='2010')document.getElementById('auth').style.display='none'">ENTER</button>
        </div>
    </div>
    <div class="sidebar">
        <h3>FX-TERMINAL</h3>
        <button class="nav" onclick="show('coin')">>> COIN YUBORISH</button>
        <button class="nav" onclick="show('uc')">>> UC XARIDLAR</button>
    </div>
    <div class="main">
        <div id="p-coin">
            <h2>💰 COIN YUBORISH</h2>
            <div class="card">
                <input type="text" id="t-uid" placeholder="User ID">
                <input type="number" id="t-amt" placeholder="Miqdor">
                <button class="nav" onclick="send()">YUBORISH</button>
            </div>
        </div>
        <div id="p-uc" style="display:none">
            <h2>💎 UC XARIDLAR KODLARI</h2>
            <div class="card">
                <table id="uTable"><thead><tr><th>User ID</th><th>KOD</th><th>UC</th></tr></thead><tbody></tbody></table>
            </div>
        </div>
    </div>
    <script>
        function show(p) {
            document.getElementById('p-coin').style.display = p === 'coin' ? 'block' : 'none';
            document.getElementById('p-uc').style.display = p === 'uc' ? 'block' : 'none';
            if(p === 'uc') loadUC();
        }
        async function loadUC() {
            const res = await fetch('/api/admin/orders');
            const data = await res.json();
            document.querySelector('#uTable tbody').innerHTML = data.map(o => \`<tr><td>\${o.userId}</td><td>\${o.code}</td><td>\${o.ucAmount}</td></tr>\`).join('');
        }
        async function send() {
            await fetch('/api/admin/add-coin', {
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

// 5. ASOSIY SAHIFA (FRONTEND)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT | BULLDROP</title>
    <style>
        body { background: #050608; color: white; font-family: sans-serif; margin: 0; display: flex; flex-direction: column; height: 100vh; }
        header { background: #0a0b10; padding: 15px 5%; display: flex; justify-content: space-between; border-bottom: 1px solid #1a1c24; }
        .main-wrapper { display: flex; flex: 1; overflow: hidden; }
        .left-panel { width: 320px; background: #0d0e14; border-right: 1px solid #1a1c24; padding: 20px; box-sizing: border-box; }
        .right-panel { flex: 1; padding: 25px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; align-content: start; }
        .card { background: #15171f; border-radius: 10px; border: 1px solid #2d3245; padding: 15px; text-align: center; transition: 0.3s; }
        .card:hover { border-color: #f57c00; transform: translateY(-3px); }
        .case-img { width: 100%; height: 140px; object-fit: contain; }
        .btn { width: 100%; padding: 10px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: 5px; }
        .btn-gold { background: #f57c00; color: black; }
        .btn-dark { background: #2d3245; color: white; }
        select, input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: white; margin-bottom: 15px; border-radius: 5px; box-sizing: border-box; }
        #modal { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.9); z-index:1000; justify-content:center; align-items:center; flex-direction:column; }
        .win-img { width: 250px; filter: drop-shadow(0 0 20px #f57c00); }
    </style>
</head>
<body>
    <header>
        <div style="color:#f57c00; font-size: 24px; font-weight: bold;">FX-LOOT</div>
        <div style="display:flex; gap:15px; align-items:center;">
            <div id="uIdDisp" style="color:#555; font-size:12px;">ID: ...</div>
            <div class="balance" style="border: 1px solid #f57c00; padding: 5px 15px; border-radius: 20px; color:#f57c00; font-weight:bold;">💰 <span id="balDisp">0</span> Fx</div>
        </div>
    </header>

    <div class="main-wrapper">
        <div class="left-panel">
            <h3 style="color:#f57c00; margin-top:0;">💎 UC XARID QILISH</h3>
            <select id="ucSelect">
                <option value="3000|60">60 UC - 3000 Fx</option>
                <option value="6000|120">120 UC - 6000 Fx</option>
                <option value="18000|360">360 UC - 18000 Fx</option>
            </select>
            <input type="text" id="promo" placeholder="Promokod">
            <button class="btn btn-gold" onclick="exchange()">AYLANTIRISH</button>
            <div style="margin-top:30px; font-size:11px; color:#555; line-height:1.6;">
                <b>EHTIMOLLIKLAR:</b><br>
                - ULTIMATE: 0.4% (2000 Fx)<br>
                - MYTHIC: 15% (700 Fx)<br>
                - LEGENDARY: 25% (150 Fx)<br>
                - SILVER: 70% (1 Fx)
            </div>
        </div>
        <div class="right-panel">
            <div class="card">
                <img src="https://i.ibb.co/m0f6pW6/mummy-case.png" class="case-img">
                <h4>MUMMY CASE</h4>
                <button class="btn btn-gold" onclick="openCase(1)">1x - 70 Fx</button>
                <button class="btn btn-dark" onclick="openCase(10)">10x - 700 Fx</button>
            </div>
            <div class="card">
                <img src="https://i.ibb.co/YyY2XyF/xsuit-case.png" class="case-img">
                <h4>X-SUIT CASE</h4>
                <button class="btn btn-gold" onclick="openCase(1)">1x - 70 Fx</button>
                <button class="btn btn-dark" onclick="openCase(10)">10x - 700 Fx</button>
            </div>
            <div class="card">
                <img src="https://i.ibb.co/tB7P0WJ/fiend.png" class="case-img">
                <h4>GLACIER CASE</h4>
                <button class="btn btn-gold" onclick="openCase(1)">1x - 70 Fx</button>
                <button class="btn btn-dark" onclick="openCase(10)">10x - 700 Fx</button>
            </div>
        </div>
    </div>

    <div id="modal">
        <h1 id="rTitle">WIN!</h1>
        <img id="rImg" class="win-img" src="">
        <h2 id="rName">ITEM</h2>
        <button class="btn btn-gold" id="sellBtn" style="width:250px">SOTISH</button>
        <button class="btn" style="background:none; color:white; margin-top:10px;" onclick="document.getElementById('modal').style.display='none'">YOPISH</button>
    </div>

    <script>
        let myId = localStorage.getItem('fxUserId') || "USER_" + Math.floor(Math.random()*9999);
        localStorage.setItem('fxUserId', myId);
        let myBalance = 0;

        const ITEMS = [
            { name: "Pharaoh X-Suit", rarity: "ULTIMATE", prob: 0.004, price: 2000, img: "https://i.ibb.co/hR0fH8B/poseidon.png" },
            { name: "M416 Glacier", rarity: "MYTHIC", prob: 0.15, price: 700, img: "https://i.ibb.co/tB7P0WJ/fiend.png" },
            { name: "L-Skin", rarity: "LEGENDARY", prob: 0.25, price: 150, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" },
            { name: "Serevro", rarity: "SILVER", prob: 0.70, price: 1, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" }
        ];

        async function load() {
            document.getElementById('uIdDisp').innerText = "ID: " + myId;
            const res = await fetch('/api/user/' + myId);
            const user = await res.json();
            myBalance = user.fxCoin;
            document.getElementById('balDisp').innerText = myBalance;
        }

        async function openCase(count) {
            let cost = count * 70;
            if(myBalance < cost) return alert("Coin yetarli emas!");
            
            myBalance -= cost;
            document.getElementById('balDisp').innerText = myBalance;
            await fetch('/api/user/update-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:myId, amount:-cost})});

            let r = Math.random();
            let win = r <= 0.004 ? ITEMS[0] : (r <= 0.15 ? ITEMS[1] : (r <= 0.25 ? ITEMS[2] : ITEMS[3]));
            
            document.getElementById('rTitle').innerText = win.rarity;
            document.getElementById('rTitle').style.color = win.price >= 1000 ? 'magenta' : (win.price >= 500 ? 'red' : 'orange');
            document.getElementById('rImg').src = win.img;
            document.getElementById('rName').innerText = win.name;
            document.getElementById('sellBtn').innerText = "SOTISH (" + win.price + " Fx)";
            document.getElementById('sellBtn').onclick = () => sell(win.price);
            document.getElementById('modal').style.display = 'flex';
        }

        async function sell(p) {
            myBalance += p;
            document.getElementById('balDisp').innerText = myBalance;
            await fetch('/api/user/update-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:myId, amount:p})});
            document.getElementById('modal').style.display = 'none';
        }

        async function exchange() {
            const val = document.getElementById('ucSelect').value.split('|');
            const res = await fetch('/api/user/exchange', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: myId, amount: parseInt(val[0]), uc: val[1], promo: document.getElementById('promo').value })
            });
            const data = await res.json();
            if(data.success) alert("XARID QILINDI! KOD: " + data.code);
            else alert("Xatolik!");
            location.reload();
        }
        load();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server ishga tushdi"));
