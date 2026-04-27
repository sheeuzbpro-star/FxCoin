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
    .catch(err => console.error("❌ DB Xatosi:", err));

// 2. SCHEMAS
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 1000 }, // Test uchun 1000 coin beriladi
    inventory: Array
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    code: String,
    userId: String,
    ucAmount: Number,
    status: { type: String, default: 'pending' }
}));

// 3. API ENDPOINTS
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 1000 });
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

// 4. FRONTEND & ADMIN ROUTING
app.get('/admin', (req, res) => {
    res.send(adminPage()); // Admin panel funksiyasi pastda
});

app.get('/', (req, res) => {
    res.send(mainPage()); // Asosiy BullDrop sahifasi pastda
});

// --- FRONTEND TEMPLATES ---

function mainPage() {
    return `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT | BullDrop Case</title>
    <style>
        :root { --gold: #ffcc00; --bg: #0a0b10; --card: #15171f; }
        body { background: var(--bg); color: white; font-family: 'Segoe UI', sans-serif; margin: 0; overflow-x: hidden; }
        header { background: #1a1c24; padding: 15px 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2d3245; position: sticky; top:0; z-index: 100; }
        .balance-box { background: #000; padding: 8px 20px; border-radius: 20px; border: 1px solid var(--gold); color: var(--gold); font-weight: bold; }
        
        .container { padding: 40px 5%; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 25px; }
        .case-card { background: var(--card); border-radius: 15px; padding: 20px; text-align: center; transition: 0.3s; border: 1px solid #2d3245; position: relative; cursor: pointer; }
        .case-card:hover { transform: translateY(-10px); border-color: var(--gold); }
        .case-img { width: 100%; height: 200px; object-fit: contain; margin-bottom: 15px; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); }
        .case-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .price { color: var(--gold); font-size: 20px; margin-bottom: 15px; }
        .open-btn { background: var(--gold); color: black; border: none; padding: 10px 25px; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; }

        /* Modal / Roulette */
        #modal { display: none; position: fixed; top:0; left:0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; flex-direction: column; }
        .roulette-container { width: 80%; max-width: 600px; height: 150px; border: 2px solid var(--gold); position: relative; overflow: hidden; background: #111; display: flex; align-items: center; }
        .pointer { position: absolute; top: 0; left: 50%; width: 4px; height: 100%; background: red; z-index: 10; transform: translateX(-50%); }
        .items-track { display: flex; position: absolute; left: 0; transition: 5s cubic-bezier(0.1, 0, 0.1, 1); }
        .item-box { min-width: 120px; height: 120px; margin: 0 5px; background: #222; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; font-size: 10px; border-bottom: 4px solid gray; }
        
        .win-screen { display: none; text-align: center; animation: fadeIn 0.5s; }
        @keyframes fadeIn { from {opacity:0} to {opacity:1} }
        .win-img { width: 200px; height: 200px; object-fit: contain; }
        .sell-btn { background: #4caf50; color: white; padding: 10px 20px; border: none; margin-top: 20px; cursor: pointer; border-radius: 5px; }
    </style>
</head>
<body>
    <header>
        <div style="font-size: 24px; font-weight: bold; color: var(--gold);">FX-LOOT <span style="color:white">BULLDROP</span></div>
        <div style="display: flex; gap: 20px; align-items: center;">
            <div id="uIdDisp" style="font-size: 12px; color: #aaa;">ID: ...</div>
            <div class="balance-box">💰 <span id="balDisp">0</span> Fx</div>
        </div>
    </header>

    <div class="container" id="casesContainer"></div>

    <div id="modal">
        <div id="rouletteWrap" style="text-align:center; width:100%;">
            <h2 id="openingTitle">KEYS OPENING...</h2>
            <div class="roulette-container">
                <div class="pointer"></div>
                <div id="track" class="items-track"></div>
            </div>
        </div>

        <div id="winScreen" class="win-screen">
            <h1 style="color: var(--gold);">TABRIKLAYMIZ!</h1>
            <img id="winImg" class="win-img" src="">
            <h2 id="winName">Item Name</h2>
            <p id="winPrice" style="color: var(--gold);"></p>
            <button class="sell-btn" onclick="sellItem()">FXCOINGA ALMASHISH (SOTISH)</button>
            <button class="open-btn" style="margin-top:10px; background:#444; color:white;" onclick="closeModal()">YOPISH</button>
        </div>
    </div>

    <script>
        let myId = localStorage.getItem('fxUserId') || "USER_" + Math.floor(Math.random()*9999);
        localStorage.setItem('fxUserId', myId);
        let myBalance = 0;
        let currentWin = null;

        const CASES = [
            { name: "Fraven Case", price: 500, img: "https://pht.qoo-static.com/O6L66-6f6f6f6f6f6f6f.png", items: [
                { name: "Fraven Mask", price: 100, rarity: "common", img: "https://img.pubg.direct/items/fraven_mask.png" },
                { name: "Fraven Suit", price: 1500, rarity: "mythic", img: "https://img.pubg.direct/items/fraven_suit.png" }
            ]},
            { name: "Varon Case", price: 800, img: "https://img.pubg.direct/items/varon_case.png", items: [
                { name: "Varon Gloves", price: 200, rarity: "common", img: "https://img.pubg.direct/items/varon_gloves.png" },
                { name: "Varon Set", price: 2500, rarity: "mythic", img: "https://img.pubg.direct/items/varon_set.png" }
            ]},
            { name: "Mummy Case", price: 1500, img: "https://img.pubg.direct/items/mummy_case.png", items: [
                { name: "White Mummy", price: 5000, rarity: "mythic", img: "https://img.pubg.direct/items/white_mummy.png" },
                { name: "Yellow Mummy", price: 4000, rarity: "mythic", img: "https://img.pubg.direct/items/yellow_mummy.png" }
            ]}
        ];

        async function init() {
            document.getElementById('uIdDisp').innerText = "ID: " + myId;
            const res = await fetch('/api/user/' + myId);
            const data = await res.json();
            myBalance = data.fxCoin;
            updateUI();
            renderCases();
        }

        function updateUI() {
            document.getElementById('balDisp').innerText = myBalance;
        }

        function renderCases() {
            const container = document.getElementById('casesContainer');
            CASES.forEach((c, idx) => {
                container.innerHTML += \`
                    <div class="case-card" onclick="openCase(\${idx})">
                        <img src="\${c.img}" class="case-img" onerror="this.src='https://icons.iconarchive.com/icons/custom-icon-design/flatastic-2/512/product-icon.png'">
                        <div class="case-name">\${c.name}</div>
                        <div class="price">\${c.price} Fx</div>
                        <button class="open-btn">OCHISH</button>
                    </div>
                \`;
            });
        }

        async function openCase(idx) {
            const c = CASES[idx];
            if(myBalance < c.price) return alert("Mablag' yetarli emas!");

            myBalance -= c.price;
            updateUI();
            await fetch('/api/user/update-balance', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: myId, amount: -c.price })
            });

            document.getElementById('modal').style.display = 'flex';
            document.getElementById('rouletteWrap').style.display = 'block';
            document.getElementById('winScreen').style.display = 'none';

            // Roulette logic
            const track = document.getElementById('track');
            track.innerHTML = '';
            track.style.transition = 'none';
            track.style.left = '0px';

            let pool = [];
            for(let i=0; i<50; i++) {
                const randItem = c.items[Math.floor(Math.random()*c.items.length)];
                pool.push(randItem);
                track.innerHTML += \`
                    <div class="item-box" style="border-color: \${randItem.rarity == 'mythic' ? 'red' : 'gray'}">
                        <img src="\${randItem.img}" width="60" onerror="this.src='https://icons.iconarchive.com/icons/google/noto-emoji-objects/256/62873-package-icon.png'">
                        <span>\${randItem.name}</span>
                    </div>
                \`;
            }

            setTimeout(() => {
                track.style.transition = '5s cubic-bezier(0.1, 0, 0.1, 1)';
                const stopPos = -((40 * 130) + (Math.random()*100)); // Win item is around 40-45th
                track.style.left = stopPos + 'px';
                
                setTimeout(() => {
                    currentWin = pool[43]; // Adjusted index
                    showWin();
                }, 5200);
            }, 100);
        }

        function showWin() {
            document.getElementById('rouletteWrap').style.display = 'none';
            document.getElementById('winScreen').style.display = 'block';
            document.getElementById('winImg').src = currentWin.img;
            document.getElementById('winName').innerText = currentWin.name;
            document.getElementById('winPrice').innerText = "NARXI: " + currentWin.price + " Fx";
        }

        async function sellItem() {
            myBalance += currentWin.price;
            updateUI();
            await fetch('/api/user/update-balance', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: myId, amount: currentWin.price })
            });
            alert("Sotildi! +" + currentWin.price + " Fx");
            closeModal();
        }

        function closeModal() { document.getElementById('modal').style.display = 'none'; }
        
        init();
    </script>
</body>
</html>`;
}

function adminPage() {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FX-ADMIN</title>
    <style>
        body { background: #000; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .login-card { background: #111; padding: 30px; border-radius: 10px; border: 1px solid #333; width: 300px; text-align: center; }
        input { width: 100%; padding: 10px; margin: 10px 0; background: #222; border: 1px solid #444; color: white; }
        button { width: 100%; padding: 10px; background: orange; border: none; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div id="adminLogin" class="login-card">
        <h2>ADMIN LOGIN</h2>
        <input type="password" id="pass" placeholder="Parol">
        <button onclick="login()">KIRISH</button>
    </div>

    <div id="adminPanel" class="login-card" style="display:none; width: 500px;">
        <h2>💰 FX-CONTROL</h2>
        <input type="text" id="targetId" placeholder="User ID">
        <input type="number" id="targetAmt" placeholder="Qancha FxCoin?">
        <button onclick="sendFx()">YUBORISH</button>
        <div id="log" style="margin-top:10px; font-size: 12px; color: lime;"></div>
    </div>

    <script>
        function login() {
            if(document.getElementById('pass').value === '2010') {
                document.getElementById('adminLogin').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'block';
            } else { alert("Xato!"); }
        }

        async function sendFx() {
            const userId = document.getElementById('targetId').value;
            const amount = document.getElementById('targetAmt').value;
            const res = await fetch('/api/admin/add-coin', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId, amount })
            });
            const data = await res.json();
            document.getElementById('log').innerText = "✅ Yuborildi! Yangi balans: " + data.balance;
        }
    </script>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server is running on port " + PORT));
