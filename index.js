const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION (Xatolikni oldini olish uchun try-catch)
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("❌ XATO: Render'da MONGO_URI sozlanmagan!");
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Baza bog'landi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

// 2. MODELLAR
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 0 },
    inventory: Array
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    code: String,
    userId: String,
    ucAmount: Number,
    status: { type: String, default: 'pending' }
}));

// 3. API YO'LLARI
app.get('/api/user/:id', async (req, res) => {
    try {
        let user = await User.findOne({ userId: req.params.id });
        if (!user) user = await User.create({ userId: req.params.id, fxCoin: 100 }); // Bonus 100
        res.json(user);
    } catch (e) { res.status(500).send(e.message); }
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

// 4. ADMIN PANEL (Yashirin /admin yo'lida)
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>FX-ADMIN PANEL</title>
    <style>
        body { background: #000; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .box { background: #111; padding: 30px; border-radius: 10px; border: 1px solid orange; width: 320px; text-align: center; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #222; border: 1px solid #444; color: white; border-radius: 5px; box-sizing: border-box;}
        button { width: 100%; padding: 12px; background: orange; border: none; font-weight: bold; cursor: pointer; border-radius: 5px; }
    </style>
</head>
<body>
    <div id="loginArea" class="box">
        <h2 style="color:orange">ADMIN LOGIN</h2>
        <input type="password" id="pw" placeholder="Parol">
        <button onclick="enter()">KIRISH</button>
    </div>
    <div id="mainArea" class="box" style="display:none">
        <h2 style="color:lime">ADMIN PANEL</h2>
        <input type="text" id="uid" placeholder="Foydalanuvchi ID">
        <input type="number" id="amt" placeholder="FxCoin miqdori">
        <button onclick="send()">COIN YUBORISH</button>
        <p id="msg" style="font-size:12px; margin-top:10px"></p>
    </div>
    <script>
        function enter() {
            if(document.getElementById('pw').value === '2010') {
                document.getElementById('loginArea').style.display = 'none';
                document.getElementById('mainArea').style.display = 'block';
            } else { alert("Parol xato!"); }
        }
        async function send() {
            const userId = document.getElementById('uid').value;
            const amount = document.getElementById('amt').value;
            const res = await fetch('/api/admin/add-coin', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId, amount })
            });
            const data = await res.json();
            document.getElementById('msg').innerText = "✅ Yuborildi! Balans: " + data.balance;
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
        body { background: #0a0b10; color: white; font-family: 'Segoe UI', sans-serif; margin: 0; }
        header { background: #15171f; padding: 15px 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2d3245; }
        .balance { color: #ffcc00; font-weight: bold; background: #000; padding: 5px 15px; border-radius: 20px; border: 1px solid #ffcc00; }
        .container { padding: 40px 5%; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .case { background: #1a1c24; border-radius: 15px; padding: 20px; text-align: center; border: 1px solid #333; transition: 0.3s; cursor: pointer; }
        .case:hover { border-color: #ffcc00; transform: scale(1.02); }
        .case img { width: 100%; height: 200px; object-fit: contain; }
        .open-btn { background: #ffcc00; color: #000; border: none; padding: 10px; width: 100%; border-radius: 5px; font-weight: bold; margin-top: 10px; cursor: pointer; }
        #modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 1000; justify-content: center; align-items: center; flex-direction: column; }
        .win-img { width: 250px; animation: bounce 1s infinite alternate; }
        @keyframes bounce { from {transform: translateY(0)} to {transform: translateY(-20px)} }
    </style>
</head>
<body>
    <header>
        <div style="font-size: 20px; color: #ffcc00; font-weight: bold;">FX-LOOT</div>
        <div style="display:flex; gap:15px; align-items:center;">
            <div id="uIdDisp" style="font-size:12px; color:#777"></div>
            <div class="balance">💰 <span id="balDisp">0</span> Fx</div>
        </div>
    </header>

    <div class="container" id="cases"></div>

    <div id="modal" onclick="this.style.display='none'">
        <h1 style="color:#ffcc00">TABRIKLAYMIZ!</h1>
        <img id="winImg" class="win-img" src="">
        <h2 id="winName"></h2>
        <button class="open-btn" style="width: 200px;" onclick="sell()">FXCOINGA SOTISH</button>
        <p style="font-size:12px; color:#aaa; margin-top:20px">Yopish uchun ekranga bosing</p>
    </div>

    <script>
        let myId = localStorage.getItem('fxUserId') || "USER_" + Math.floor(Math.random()*9999);
        localStorage.setItem('fxUserId', myId);
        let myBalance = 0;
        let lastItem = null;

        const CASES = [
            { name: "Mummy Case", price: 500, img: "https://i.ibb.co/m0f6pW6/mummy-case.png", items: [
                { name: "White Mummy", price: 5000, img: "https://www.pubg.com/wp-content/uploads/2021/10/mummy.png" },
                { name: "Scarecrow Set", price: 200, img: "https://img.pubg.direct/items/scarecrow.png" }
            ]},
            { name: "X-Suit Case", price: 2000, img: "https://i.ibb.co/YyY2XyF/xsuit-case.png", items: [
                { name: "Poseidon X-Suit", price: 10000, img: "https://i.ibb.co/hR0fH8B/poseidon.png" },
                { name: "Fiend Huntress", price: 500, img: "https://i.ibb.co/tB7P0WJ/fiend.png" }
            ]}
        ];

        async function load() {
            document.getElementById('uIdDisp').innerText = myId;
            const res = await fetch('/api/user/' + myId);
            const user = await res.json();
            myBalance = user.fxCoin;
            updateUI();
            render();
        }

        function updateUI() { document.getElementById('balDisp').innerText = myBalance; }

        function render() {
            const div = document.getElementById('cases');
            div.innerHTML = '';
            CASES.forEach((c, i) => {
                div.innerHTML += \`
                    <div class="case" onclick="openCase(\${i})">
                        <img src="\${c.img}" onerror="this.src='https://icons.iconarchive.com/icons/google/noto-emoji-objects/256/62873-package-icon.png'">
                        <h3>\${c.name}</h3>
                        <p style="color:#ffcc00">\${c.price} FxCoin</p>
                        <button class="open-btn">OCHISH</button>
                    </div>\`;
            });
        }

        async function openCase(i) {
            const c = CASES[i];
            if(myBalance < c.price) return alert("Tangalar yetarli emas!");
            
            myBalance -= c.price;
            updateUI();
            await fetch('/api/user/update-balance', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: myId, amount: -c.price })
            });

            lastItem = c.items[Math.floor(Math.random()*c.items.length)];
            document.getElementById('winImg').src = lastItem.img;
            document.getElementById('winName').innerText = lastItem.name;
            document.getElementById('modal').style.display = 'flex';
        }

        async function sell() {
            myBalance += lastItem.price;
            updateUI();
            await fetch('/api/user/update-balance', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: myId, amount: lastItem.price })
            });
            alert("Sotildi! +" + lastItem.price + " Fx");
            document.getElementById('modal').style.display = 'none';
        }

        load();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Server running on port " + PORT));
