const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MONGODB BAZASI ---
// Agar baza ulanmasa ham sayt ishlayveradi (crash bo'lmaydi)
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://demo:demo@cluster.mongodb.net/fxloot?retryWrites=true&w=majority")
    .then(() => console.log("✅ Baza ulandi"))
    .catch(err => console.error("⚠️ Baza ulanmadi, lekin sayt ishlashda davom etadi."));

const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 0 }
}));

// --- 2. API YO'LLARI ---
app.get('/api/user/:id', async (req, res) => {
    try {
        let user = await User.findOne({ userId: req.params.id });
        if (!user) user = await User.create({ userId: req.params.id, fxCoin: 0 });
        res.json(user);
    } catch(err) {
        res.json({ userId: req.params.id, fxCoin: 0 }); // Baza xato qilsa nol qaytaradi
    }
});

app.post('/api/user/update', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount } }, { new: true });
        res.json(user);
    } catch(err) {
        res.json({ success: false });
    }
});

app.post('/api/admin/add', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
        res.json({ success: true, balance: user.fxCoin });
    } catch(err) {
        res.json({ success: false });
    }
});

// --- 3. ADMIN PANEL ---
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>ADMIN PANEL</title>
    <style>
        body { background-color: #050505; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
        .admin-box { background-color: #1a1c23; border: 1px solid #f57c00; border-radius: 8px; padding: 40px; width: 350px; text-align: center; }
        h2 { color: #00ff00; margin-top: 0; margin-bottom: 30px; font-weight: bold; }
        input { width: 100%; padding: 15px; margin-bottom: 20px; background-color: #2a2d35; border: 1px solid #333; color: white; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 15px; background-color: #f57c00; color: black; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="admin-box">
        <h2>ADMIN PANEL</h2>
        <input type="text" id="uid" placeholder="Foydalanuvchi ID">
        <input type="number" id="amt" placeholder="Miqdor (masalan: 10000)">
        <button onclick="sendCoin()">COIN YUBORISH</button>
    </div>
    <script>
        async function sendCoin() {
            const id = document.getElementById('uid').value;
            const amt = document.getElementById('amt').value;
            if(!id || !amt) return alert("Ma'lumotni kiriting!");
            const res = await fetch('/api/admin/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: id, amount: amt })
            });
            const data = await res.json();
            if(data.success) alert("Balans yangilandi!");
        }
    </script>
</body>
</html>`);
});

// --- 4. ASOSIY SAYT ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT</title>
    <style>
        body { background-color: #0f1015; color: white; font-family: sans-serif; margin: 0; }
        header { background-color: #15171e; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2a2d35; }
        .logo { color: #f57c00; font-size: 24px; font-weight: 900; }
        .user-info { display: flex; align-items: center; gap: 20px; }
        .balance-btn { background-color: #000; border: 1px solid #f57c00; color: #f57c00; padding: 8px 15px; border-radius: 20px; font-weight: bold; }
        
        .container { display: flex; height: calc(100vh - 65px); }
        .sidebar { width: 300px; background-color: #121319; padding: 20px; border-right: 1px solid #2a2d35; }
        .content { flex: 1; padding: 30px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 20px; align-content: flex-start; }

        .crate { background-color: #1c1e26; border-radius: 10px; width: 220px; height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; border: 1px solid transparent; transition: 0.3s; }
        .crate:hover { border-color: #fce803; }
        .crate-name { color: #fce803; font-weight: bold; font-size: 18px; margin-bottom: 15px;}
        .crate-price { color: #888; font-size: 14px; }
        
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; }
        .modal-box { background-color: #1a1c23; border: 1px solid #f57c00; padding: 30px; border-radius: 15px; text-align: center; max-width: 700px; }
        .items-grid { display: flex; justify-content: center; gap: 20px; margin: 30px 0; flex-wrap: wrap; }
        .item-card { background-color: #2a2d35; padding: 15px; border-radius: 8px; width: 100px; border: 1px solid #444; }
        .item-img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; }
        .item-name { font-size: 12px; color: white; }
        .btn { background-color: #f57c00; color: black; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; border-radius: 5px; margin: 5px; }
    </style>
</head>
<body>

    <header>
        <div class="logo">FX-LOOT</div>
        <div class="user-info">
            <span id="displayId" style="color:#888;">USER_...</span>
            <div class="balance-btn">💰 <span id="displayBal">0</span> Fx</div>
            <span style="cursor:pointer;" onclick="openSettings()">⚙️</span>
        </div>
    </header>

    <div class="container">
        <div class="sidebar">
            <h3 style="color:#f57c00;">💎 UC XARID QILISH</h3>
            <select style="width:100%; padding:10px; background:#000; color:white; border:1px solid #333;"><option>60 UC - 3000 Fx</option></select>
        </div>

        <div class="content" id="cratesContainer"></div>
    </div>

    <div id="caseModal" class="modal">
        <div class="modal-box">
            <h2 id="modalTitle" style="color:#fce803;">CRATE</h2>
            <div class="items-grid" id="modalItems"></div>
            <div>
                <button class="btn" onclick="openCrate(1)">1x OCHISH (70 Fx)</button>
                <button class="btn" style="background:#444; color:white;" onclick="openCrate(10)">10x OCHISH (700 Fx)</button>
            </div>
            <button class="btn" style="background:transparent; color:#888;" onclick="closeModals()">Yopish</button>
        </div>
    </div>

    <div id="winModal" class="modal">
        <div class="modal-box" style="max-width: 350px;">
            <h1 id="winRarity" style="color:#f57c00;">MYTHIC</h1>
            <img id="winImg" style="width:150px; margin:20px 0;">
            <h3 id="winName">Item</h3>
            <button class="btn" style="width:100%;" id="sellBtn">SOTISH</button>
        </div>
    </div>

    <script>
        let userId = localStorage.getItem('fx_user');
        if(!userId) {
            userId = 'USER_' + Math.floor(Math.random() * 9000 + 1000);
            localStorage.setItem('fx_user', userId);
        }
        let balance = 0;
        let currentPool = [];

        const GAME_DATA = {
            mummy: { name: "Mummy Crate", items: [{name: "Golden Mummy", rarity: "MYTHIC", price: 1500, img: "https://i.ibb.co/3s68KXY/mummy.png"}, {name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png"}] },
            glacier: { name: "Glacier Crate", items: [{name: "M416 Glacier", rarity: "MYTHIC", price: 2000, img: "https://i.ibb.co/tB7P0WJ/fiend.png"}, {name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png"}] },
            pharaoh: { name: "Pharaoh Crate", items: [{name: "Pharaoh X-Suit", rarity: "ULTIMATE", price: 3000, img: "https://i.ibb.co/XSBG6Y0/pharaoh.png"}, {name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png"}] },
            poseidon: { name: "Poseidon Crate", items: [{name: "Poseidon X-Suit", rarity: "ULTIMATE", price: 3000, img: "https://i.ibb.co/hR0fH8B/poseidon.png"}, {name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png"}] },
            avalanche: { name: "Avalanche Crate", items: [{name: "Avalanche X-Suit", rarity: "ULTIMATE", price: 2500, img: "https://i.ibb.co/XSBG6Y0/pharaoh.png"}, {name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png"}] }
        };

        // KEYSLARNI BIRINCHI CHIZISH (Xatoga qaramay chiqadi)
        function drawCrates() {
            let html = '';
            for(let key in GAME_DATA) {
                html += '<div class="crate" onclick="viewCrate(\\'' + key + '\\')">';
                html += '<div class="crate-name">' + GAME_DATA[key].name + '</div>';
                html += '<div class="crate-price">Cost: 70 Fx</div>';
                html += '</div>';
            }
            document.getElementById('cratesContainer').innerHTML = html;
        }

        async function init() {
            document.getElementById('displayId').innerText = userId;
            drawCrates(); // Keyslar darhol chiqadi!
            
            try {
                const res = await fetch('/api/user/' + userId);
                if(res.ok) {
                    const data = await res.json();
                    balance = data.fxCoin || 0;
                    document.getElementById('displayBal').innerText = balance;
                }
            } catch(e) {
                console.log("Baza ulanmadi, lekin vizual ishlaydi.");
            }
        }

        function viewCrate(key) {
            currentPool = GAME_DATA[key].items;
            document.getElementById('modalTitle').innerText = GAME_DATA[key].name;
            
            let itemsHtml = '';
            for(let i=0; i<currentPool.length; i++) {
                itemsHtml += '<div class="item-card">';
                itemsHtml += '<img src="' + currentPool[i].img + '" class="item-img">';
                itemsHtml += '<div class="item-name">' + currentPool[i].name + '</div>';
                itemsHtml += '</div>';
            }
            document.getElementById('modalItems').innerHTML = itemsHtml;
            document.getElementById('caseModal').style.display = 'flex';
        }

        async function openCrate(times) {
            const cost = times * 70;
            if(balance < cost && balance !== 0) return alert("Coin yetarli emas!"); // Agar bazaga ulanmagan bo'lsa tekinga ochadi test uchun

            try {
                await fetch('/api/user/update', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId, amount: -cost }) });
            } catch(e) {}

            let rand = Math.random();
            let winItem = currentPool[currentPool.length - 1]; 
            if(rand < 0.1) winItem = currentPool[0];

            document.getElementById('winRarity').innerText = winItem.rarity;
            document.getElementById('winImg').src = winItem.img;
            document.getElementById('winName').innerText = winItem.name;
            document.getElementById('sellBtn').innerText = "SOTISH (" + winItem.price + " Fx)";
            document.getElementById('sellBtn').onclick = function() { sellItem(winItem.price); };

            closeModals();
            document.getElementById('winModal').style.display = 'flex';
            init();
        }

        async function sellItem(price) {
            try {
                await fetch('/api/user/update', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId, amount: price }) });
            } catch(e) {}
            closeModals();
            init();
        }

        function openSettings() {
            let pass = prompt("Maxfiy kod:");
            if(pass === "admin2010") {
                fetch('/api/user/update', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId, amount: 10000 }) })
                .then(() => { alert("10,000 FxCoin qo'shildi!"); init(); });
            }
        }

        function closeModals() {
            document.getElementById('caseModal').style.display = 'none';
            document.getElementById('winModal').style.display = 'none';
        }

        init();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server ishladi: Port " + PORT));
