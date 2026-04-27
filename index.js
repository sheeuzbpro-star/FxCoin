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
    fxCoin: { type: Number, default: 500 }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    code: String,
    userId: String,
    ucAmount: Number,
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

app.post('/api/user/update-balance', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount } }, { new: true });
    res.json(user);
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

app.get('/api/admin/orders', async (req, res) => {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
});

// 4. ADMIN PANEL
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
        .card { background: #0d0e14; border: 1px solid #00ff00; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        input { background: #000; border: 1px solid #00ff00; color: #00ff00; padding: 12px; width: 100%; margin-bottom: 10px; }
        button { width: 100%; padding: 12px; background: #111; color: #00ff00; border: 1px solid #00ff00; cursor: pointer; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h3>FX-TERMINAL</h3>
        <button onclick="show('coin')">COIN YUBORISH</button><br><br>
        <button onclick="show('uc')">UC KODLAR</button>
    </div>
    <div class="main">
        <div id="p-coin">
            <div class="card">
                <h2>💰 COIN TUSHURISH</h2>
                <input type="text" id="t-uid" placeholder="Foydalanuvchi ID">
                <input type="number" id="t-amt" placeholder="Miqdor">
                <button onclick="send()">EXECUTE YUBORISH</button>
            </div>
        </div>
        <div id="p-uc" style="display:none">
            <h2>💎 UC KODLAR</h2>
            <div id="uList"></div>
        </div>
    </div>
    <script>
        function show(p){
            document.getElementById('p-coin').style.display = p=='coin'?'block':'none';
            document.getElementById('p-uc').style.display = p=='uc'?'block':'none';
            if(p=='uc') load();
        }
        async function send(){
            const res = await fetch('/api/admin/add-coin', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userId:document.getElementById('t-uid').value, amount:document.getElementById('t-amt').value})
            });
            const data = await res.json();
            if(data.success) alert("Coin yuborildi! Balans: " + data.balance);
        }
        async function load(){
            const res = await fetch('/api/admin/orders');
            const data = await res.json();
            document.getElementById('uList').innerHTML = data.map(o => \`<p>\${o.userId} | \${o.code} | \${o.ucAmount} UC</p>\`).join('');
        }
    </script>
</body>
</html>`);
});

// 5. USER FRONTEND
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT | BULLDROP</title>
    <style>
        body { background: #050608; color: white; font-family: sans-serif; margin: 0; display: flex; flex-direction: column; height: 100vh; }
        header { background: #0a0b10; padding: 15px 5%; display: flex; justify-content: space-between; border-bottom: 1px solid #1a1c24; }
        .main-wrapper { display: flex; flex: 1; overflow: hidden; }
        .left-panel { width: 320px; background: #0d0e14; border-right: 1px solid #1a1c24; padding: 20px; }
        .right-panel { flex: 1; padding: 25px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .card { background: #15171f; border-radius: 12px; border: 1px solid #2d3245; padding: 15px; text-align: center; }
        .case-img { width: 100%; height: 160px; object-fit: contain; background: #000; border-radius: 8px; }
        .btn { width: 100%; padding: 12px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: 5px; }
        .btn-gold { background: #f57c00; color: black; }
        .btn-dark { background: #2d3245; color: white; }
        .balance { color: #f57c00; font-weight: bold; border: 1px solid #f57c00; padding: 5px 15px; border-radius: 20px; }
        
        /* Modal - Keys ichiga kirish */
        #modal { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.95); z-index:1000; justify-content:center; align-items:center; flex-direction:column; }
        .win-img { width: 300px; border-radius: 20px; box-shadow: 0 0 30px #f57c00; }
    </style>
</head>
<body>
    <header>
        <div style="color:#f57c00; font-size: 24px; font-weight: bold;">FX-LOOT</div>
        <div style="display:flex; gap:15px; align-items:center;">
            <div id="uIdDisp" style="color:#777;">ID: ...</div>
            <div class="balance">💰 <span id="balDisp">0</span> Fx</div>
        </div>
    </header>

    <div class="main-wrapper">
        <div class="left-panel">
            <h3 style="color:#f57c00">💎 UC XARID QILISH</h3>
            <select id="ucSelect" style="width:100%; padding:10px; background:#000; color:white; border:1px solid #333; border-radius:5px; margin-bottom:10px;">
                <option value="3000|60">60 UC - 3000 Fx</option>
                <option value="6000|120">120 UC - 6000 Fx</option>
                <option value="18000|360">360 UC - 18000 Fx</option>
            </select>
            <input type="text" id="promo" placeholder="Promokod" style="width:100%; padding:10px; background:#000; color:white; border:1px solid #333; border-radius:5px; margin-bottom:10px; box-sizing:border-box;">
            <button class="btn btn-gold" onclick="exchange()">AYLANTIRISH</button>
        </div>

        <div class="right-panel">
            <div class="card">
                <img src="https://i.ibb.co/m0f6pW6/mummy-case.png" class="case-img">
                <h4>MUMMY CASE</h4>
                <button class="btn btn-gold" onclick="openCase('mummy', 1)">1x - 70 Fx</button>
                <button class="btn btn-dark" onclick="openCase('mummy', 10)">10x - 700 Fx</button>
            </div>
            <div class="card">
                <img src="https://i.ibb.co/YyY2XyF/xsuit-case.png" class="case-img">
                <h4>X-SUIT CASE</h4>
                <button class="btn btn-gold" onclick="openCase('xsuit', 1)">1x - 70 Fx</button>
                <button class="btn btn-dark" onclick="openCase('xsuit', 10)">10x - 700 Fx</button>
            </div>
            <div class="card">
                <img src="https://i.ibb.co/hR0fH8B/poseidon.png" class="case-img">
                <h4>GLACIER CASE</h4>
                <button class="btn btn-gold" onclick="openCase('gun', 1)">1x - 70 Fx</button>
                <button class="btn btn-dark" onclick="openCase('gun', 10)">10x - 700 Fx</button>
            </div>
        </div>
    </div>

    <div id="modal">
        <h1 id="winRarity" style="font-style:italic; margin-bottom:10px;">ULTIMATE!</h1>
        <img id="winImg" class="win-img" src="">
        <h2 id="winName" style="margin:20px 0;">ITEM NAME</h2>
        <button class="btn btn-gold" id="sellBtn" style="width:280px; padding:15px;">SOTISH (FX TUSHADI)</button>
        <button class="btn" style="background:none; color:#777; margin-top:10px;" onclick="document.getElementById('modal').style.display='none'">YOPISH</button>
    </div>

    <script>
        let myId = localStorage.getItem('fxUserId') || "USER_" + Math.floor(Math.random()*9999);
        localStorage.setItem('fxUserId', myId);
        let myBalance = 0;

        const POOL = [
            { name: "Pharaoh X-Suit", rarity: "ULTIMATE", prob: 0.004, price: 2000, img: "https://i.ibb.co/XSBG6Y0/pharaoh.png" },
            { name: "M416 Glacier", rarity: "MYTHIC", prob: 0.15, price: 700, img: "https://i.ibb.co/tB7P0WJ/fiend.png" },
            { name: "Mummy Set", rarity: "LEGENDARY", prob: 0.25, price: 150, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" },
            { name: "Serevro (Silver)", rarity: "COMMON", prob: 0.70, price: 1, img: "https://i.ibb.co/YyY2XyF/xsuit-case.png" }
        ];

        async function init() {
            document.getElementById('uIdDisp').innerText = "ID: " + myId;
            const res = await fetch('/api/user/' + myId);
            const user = await res.json();
            myBalance = user.fxCoin;
            document.getElementById('balDisp').innerText = myBalance;
        }

        async function openCase(type, count) {
            let cost = count * 70;
            if(myBalance < cost) return alert("Coin yetarli emas!");

            // Bazada balansni kamaytirish
            const res = await fetch('/api/user/update-balance', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userId:myId, amount:-cost})
            });
            const updated = await res.json();
            myBalance = updated.fxCoin;
            document.getElementById('balDisp').innerText = myBalance;

            // Random skin tanlash
            let r = Math.random();
            let win = r <= 0.004 ? POOL[0] : (r <= 0.15 ? POOL[1] : (r <= 0.25 ? POOL[2] : POOL[3]));

            // Modalda ko'rsatish
            document.getElementById('winRarity').innerText = win.rarity;
            document.getElementById('winRarity').style.color = win.price > 1000 ? 'magenta' : (win.price > 500 ? 'red' : 'orange');
            document.getElementById('winImg').src = win.img;
            document.getElementById('winName').innerText = win.name;
            document.getElementById('sellBtn').innerText = "SOTISH (" + win.price + " Fx)";
            document.getElementById('sellBtn').onclick = () => sell(win.price);
            document.getElementById('modal').style.display = 'flex';
        }

        async function sell(price) {
            const res = await fetch('/api/user/update-balance', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userId:myId, amount:price})
            });
            const updated = await res.json();
            myBalance = updated.fxCoin;
            document.getElementById('balDisp').innerText = myBalance;
            document.getElementById('modal').style.display = 'none';
            alert("Skin sotildi, balansga " + price + " Fx qo'shildi!");
        }

        async function exchange() {
            const val = document.getElementById('ucSelect').value.split('|');
            const promo = document.getElementById('promo').value;
            const res = await fetch('/api/user/exchange', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userId:myId, amount:parseInt(val[0]), uc:val[1], promo:promo})
            });
            const data = await res.json();
            if(data.success) {
                alert("XARID BAJARILDI! KOD: " + data.code);
                location.reload();
            } else {
                alert("Tangalar yetarli emas!");
            }
        }

        init();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
