const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Baza ulandi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

// 2. MODELLAR
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    email: String,
    fxCoin: { type: Number, default: 500 }
}));

// 3. API YO'LLARI
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 500 });
    res.json(user);
});

app.post('/api/user/update-balance', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount } }, { new: true });
    res.json(user);
});

app.post('/api/admin/add-coin', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
    res.json({ success: true, balance: user.fxCoin });
});

// 4. ADMIN PANEL (ISHLAYDIGAN VERSIYA)
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>FX-ADMIN</title>
    <style>
        body { background: #050608; color: #00ff00; font-family: monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { border: 2px solid #f57c00; padding: 30px; background: #0d0e14; border-radius: 15px; width: 350px; text-align: center; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #000; border: 1px solid #00ff00; color: #00ff00; box-sizing: border-box; }
        button { width: 100%; padding: 15px; background: #f57c00; border: none; font-weight: bold; cursor: pointer; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="card">
        <h2 style="color: #f57c00">ADMIN PANEL</h2>
        <input type="text" id="uid" placeholder="Foydalanuvchi ID">
        <input type="number" id="amt" placeholder="FxCoin Miqdori">
        <button onclick="send()">COIN YUBORISH</button>
    </div>
    <script>
        async function send() {
            const res = await fetch('/api/admin/add-coin', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: document.getElementById('uid').value, amount: document.getElementById('amt').value })
            });
            const data = await res.json();
            if(data.success) alert("Muvaffaqiyatli! Balans: " + data.balance);
        }
    </script>
</body>
</html>`);
});

// 5. ASOSIY FRONTEND
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT | PUBGM</title>
    <style>
        body { background: #050608; color: white; font-family: 'Segoe UI', sans-serif; margin: 0; }
        header { background: #0a0b10; padding: 10px 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a1c24; }
        .balance-box { background: #15171f; border: 1px solid #f57c00; padding: 5px 15px; border-radius: 20px; color: #f57c00; font-weight: bold; }
        
        .container { display: flex; height: calc(100vh - 65px); }
        .left-side { width: 300px; background: #0d0e14; border-right: 1px solid #1a1c24; padding: 20px; }
        .right-side { flex: 1; padding: 25px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; overflow-y: auto; }
        
        .case-card { background: #15171f; border: 1px solid #2d3245; border-radius: 12px; padding: 15px; text-align: center; cursor: pointer; transition: 0.3s; }
        .case-card:hover { border-color: #f57c00; transform: translateY(-5px); }
        .case-img { width: 100%; height: 160px; object-fit: contain; }

        .modal { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.96); z-index: 1000; justify-content: center; align-items: center; }
        .modal-content { background: #0d0e14; width: 90%; max-width: 900px; padding: 30px; border-radius: 20px; border: 2px solid #f57c00; text-align: center; }
        
        .skin-grid { display: flex; justify-content: center; gap: 15px; margin: 25px 0; overflow-x: auto; padding: 10px; }
        .skin-item { background: #15171f; padding: 15px; border-radius: 10px; border: 1px solid #333; min-width: 140px; }
        .skin-img-s { width: 100px; height: 100px; object-fit: contain; }

        .btn { width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; margin-top: 10px; }
        .btn-gold { background: #f57c00; color: black; }
    </style>
</head>
<body>
    <header>
        <div style="font-size: 24px; font-weight: bold; color: #f57c00;">FX-LOOT</div>
        <div style="display:flex; align-items:center; gap:20px;">
            <div id="uDisplay" style="color:#777; font-size:12px;">Google login orqali kiring...</div>
            <div class="balance-box">💰 <span id="bDisplay">0</span> Fx</div>
            <div onclick="openSettings()" style="cursor:pointer">⚙️</div>
        </div>
    </header>

    <div class="container">
        <div class="left-side">
            <h3 style="color:#f57c00">💎 UC XARID QILISH</h3>
            <select id="ucSelect" style="width:100%; padding:10px; background:#000; color:white; border:1px solid #333;">
                <option value="3000|60">60 UC - 3000 Fx</option>
                <option value="18000|360">360 UC - 18000 Fx</option>
            </select>
            <button class="btn btn-gold" onclick="alert('Tez kunda...')">AYLANTIRISH</button>
        </div>

        <div class="right-side" id="caseList"></div>
    </div>

    <div id="caseModal" class="modal">
        <div class="modal-content">
            <h2 id="mTitle" style="color:#f57c00">CASE CONTENT</h2>
            <div class="skin-grid" id="sGrid"></div>
            <div style="display:flex; gap:15px;">
                <button class="btn btn-gold" onclick="roll(1)">1x (70 Fx)</button>
                <button class="btn btn-gold" style="background:#222; color:white;" onclick="roll(10)">10x (700 Fx)</button>
            </div>
            <br>
            <button class="btn" style="background:none; color:#777" onclick="document.getElementById('caseModal').style.display='none'">YOPISH</button>
        </div>
    </div>

    <div id="winModal" class="modal" style="flex-direction:column;">
        <h1 id="wRarity" style="font-style:italic">MYTHIC!</h1>
        <img id="wImg" style="width:280px; filter: drop-shadow(0 0 20px gold);" src="">
        <h2 id="wName">ITEM NAME</h2>
        <button class="btn btn-gold" id="sellBtn" style="width:300px">SOTISH</button>
    </div>

    <script>
        let myId = localStorage.getItem('fxUserId') || "USER_" + Math.floor(Math.random()*9999);
        localStorage.setItem('fxUserId', myId);
        let myBalance = 0;
        let currentPool = [];

        const DATA = {
            mummy: {
                name: "MUMMY CASE",
                img: "https://i.ibb.co/m0f6pW6/mummy-case.png",
                items: [
                    { name: "Golden Mummy", rarity: "MYTHIC", price: 1000, img: "https://p16-va.lemon8cdn.com/tos-alisg-v-a3e477-sg/6653df3411b04ba59837a7b8e5159048~tplv-tej9nj120t-origin.webp" },
                    { name: "White Mummy", rarity: "LEGENDARY", price: 500, img: "https://i.ibb.co/m0f6pW6/mummy-case.png" },
                    { name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png" }
                ]
            },
            glacier: {
                name: "GLACIER CASE",
                img: "https://i.ibb.co/tB7P0WJ/fiend.png",
                items: [
                    { name: "M416 Glacier", rarity: "MYTHIC", price: 1500, img: "https://i.ibb.co/tB7P0WJ/fiend.png" },
                    { name: "Glacier Set", rarity: "LEGENDARY", price: 600, img: "https://i.ibb.co/tB7P0WJ/fiend.png" },
                    { name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png" }
                ]
            },
            poseidon: {
                name: "POSEIDON X-SUIT",
                img: "https://i.ibb.co/hR0fH8B/poseidon.png",
                items: [
                    { name: "Poseidon (Level 6)", rarity: "ULTIMATE", price: 3000, img: "https://i.ibb.co/hR0fH8B/poseidon.png" },
                    { name: "Poseidon Parachute", rarity: "LEGENDARY", price: 400, img: "https://i.ibb.co/hR0fH8B/poseidon.png" },
                    { name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png" }
                ]
            }
        };

        async function init() {
            document.getElementById('uDisplay').innerText = "ID: " + myId;
            const res = await fetch('/api/user/' + myId);
            const user = await res.json();
            myBalance = user.fxCoin;
            document.getElementById('bDisplay').innerText = myBalance;

            let html = "";
            for(let key in DATA) {
                html += \`
                <div class="case-card" onclick="openCase('\${key}')">
                    <img src="\${DATA[key].img}" class="case-img">
                    <h3>\${DATA[key].name}</h3>
                    <button class="btn btn-gold">OCHISH (70 Fx)</button>
                </div>\`;
            }
            document.getElementById('caseList').innerHTML = html;
        }

        function openCase(key) {
            currentPool = DATA[key].items;
            document.getElementById('mTitle').innerText = DATA[key].name;
            document.getElementById('sGrid').innerHTML = currentPool.map(i => \`
                <div class="skin-item">
                    <img src="\${i.img}" class="skin-img-s"><br>
                    <small>\${i.name}</small>
                </div>
            \`).join('');
            document.getElementById('caseModal').style.display = 'flex';
        }

        async function roll(n) {
            let cost = n * 70;
            if(myBalance < cost) return alert("Mablag' yetarli emas!");

            await fetch('/api/user/update-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:myId, amount:-cost})});
            
            let win = currentPool[Math.floor(Math.random() * currentPool.length)];
            
            document.getElementById('wRarity').innerText = win.rarity;
            document.getElementById('wImg').src = win.img;
            document.getElementById('wName').innerText = win.name;
            document.getElementById('sellBtn').innerText = "SOTISH (" + win.price + " Fx)";
            document.getElementById('sellBtn').onclick = () => sell(win.price);
            
            document.getElementById('winModal').style.display = 'flex';
            init();
        }

        async function sell(p) {
            await fetch('/api/user/update-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:myId, amount:p})});
            document.getElementById('winModal').style.display = 'none';
            init();
        }

        function openSettings() {
            let code = prompt("Maxfiy kodni kiriting:");
            if(code === "admin2010") {
                fetch('/api/user/update-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:myId, amount:10000})})
                .then(() => { alert("10,000 FxCoin qo'shildi!"); init(); });
            }
        }

        init();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server tayyor"));
