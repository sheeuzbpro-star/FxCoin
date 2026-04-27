const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DATABASE (MONGODB) ---
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://demo:demo@cluster.mongodb.net/fxloot?retryWrites=true&w=majority")
    .then(() => console.log("✅ Baza ulandi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 0 }
}));

// --- 2. API YO'LLARI ---
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 0 });
    res.json(user);
});

app.post('/api/user/update', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount } }, { new: true });
    res.json(user);
});

app.post('/api/admin/add', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
    res.json({ success: true, balance: user.fxCoin });
});

// --- 3. ADMIN PANEL (Rasmda ko'rsatilgandek) ---
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
        h2 { color: #00ff00; margin-top: 0; margin-bottom: 30px; font-weight: bold; letter-spacing: 1px; }
        input { width: 100%; padding: 15px; margin-bottom: 20px; background-color: #2a2d35; border: 1px solid #333; color: white; border-radius: 5px; box-sizing: border-box; font-size: 14px; outline: none; }
        input:focus { border-color: #f57c00; }
        button { width: 100%; padding: 15px; background-color: #f57c00; color: black; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 14px; transition: 0.2s; }
        button:hover { background-color: #ff9800; }
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
            if(!id || !amt) return alert("Barcha maydonlarni to'ldiring!");
            
            const res = await fetch('/api/admin/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: id, amount: amt })
            });
            const data = await res.json();
            if(data.success) {
                alert("Muvaffaqiyatli! Foydalanuvchi balansi: " + data.balance);
                document.getElementById('amt').value = '';
            }
        }
    </script>
</body>
</html>`);
});

// --- 4. ASOSIY SAYT (Keyslar va O'yin) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT</title>
    <style>
        body { background-color: #0f1015; color: white; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; }
        /* HEADER (rasmdagidek) */
        header { background-color: #15171e; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2a2d35; }
        .logo { color: #f57c00; font-size: 24px; font-weight: 900; }
        .user-info { display: flex; align-items: center; gap: 20px; }
        .user-id { color: #888; font-size: 14px; }
        .balance-btn { background-color: #000; border: 1px solid #f57c00; color: #f57c00; padding: 8px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        
        /* MAIN LAYOUT */
        .container { display: flex; height: calc(100vh - 65px); }
        .sidebar { width: 300px; background-color: #121319; padding: 20px; border-right: 1px solid #2a2d35; }
        .content { flex: 1; padding: 30px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 20px; align-content: flex-start; }

        /* CRATE CARDS (Qora fon, sariq yozuv) */
        .crate { background-color: #1c1e26; border-radius: 10px; width: 220px; height: 280px; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; box-sizing: border-box; text-align: center; cursor: pointer; border: 1px solid transparent; transition: 0.3s; }
        .crate:hover { border-color: #fce803; transform: scale(1.02); }
        .crate-name { color: #fce803; font-weight: bold; font-size: 18px; margin-top: auto; margin-bottom: auto; }
        .crate-btn { background-color: #f57c00; color: black; border: none; padding: 10px; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 5px; }
        
        /* MODAL (Keys ichi) */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; }
        .modal-box { background-color: #1a1c23; border: 1px solid #f57c00; padding: 30px; border-radius: 15px; width: 80%; max-width: 800px; text-align: center; }
        .items-grid { display: flex; justify-content: center; gap: 20px; margin: 30px 0; overflow-x: auto; }
        .item-card { background-color: #2a2d35; padding: 15px; border-radius: 8px; width: 120px; border: 1px solid #444; }
        .item-img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; }
        .item-name { font-size: 12px; color: white; }

        .settings-icon { cursor: pointer; font-size: 20px; margin-left: 10px; }
    </style>
</head>
<body>

    <header>
        <div class="logo">FX-LOOT</div>
        <div class="user-info">
            <span class="user-id" id="displayId">USER_...</span>
            <div class="balance-btn">💰 <span id="displayBal">0</span> Fx</div>
            <span class="settings-icon" onclick="openSettings()">⚙️</span>
        </div>
    </header>

    <div class="container">
        <div class="sidebar">
            <h3 style="color:#f57c00;">💎 UC XARID QILISH</h3>
            <select style="width:100%; padding:12px; background:#000; color:white; border:1px solid #333; border-radius:5px; margin-bottom:15px;">
                <option>60 UC - 3000 Fx</option>
                <option>325 UC - 15000 Fx</option>
            </select>
            <input type="text" placeholder="Promokod" style="width:100%; padding:12px; background:#000; color:white; border:1px solid #333; border-radius:5px; margin-bottom:15px; box-sizing:border-box;">
            <button class="crate-btn">AYLANTIRISH</button>
        </div>

        <div class="content" id="cratesContainer"></div>
    </div>

    <div id="caseModal" class="modal">
        <div class="modal-box">
            <h2 id="modalTitle" style="color: #fce803;">CRATE NAME</h2>
            <div class="items-grid" id="modalItems"></div>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="crate-btn" style="width: 200px;" onclick="openCrate(1)">1x OCHISH (70 Fx)</button>
                <button class="crate-btn" style="width: 200px; background:#444; color:white;" onclick="openCrate(10)">10x OCHISH (700 Fx)</button>
            </div>
            <button onclick="document.getElementById('caseModal').style.display='none'" style="margin-top:20px; background:none; color:#888; border:none; cursor:pointer;">Yopish</button>
        </div>
    </div>

    <div id="winModal" class="modal">
        <div class="modal-box" style="max-width: 400px;">
            <h1 id="winRarity" style="color:#f57c00;">MYTHIC</h1>
            <img id="winImg" style="width:150px; margin:20px 0;">
            <h3 id="winName">Item Name</h3>
            <button class="crate-btn" id="sellBtn">SOTISH</button>
        </div>
    </div>

    <script>
        // Foydalanuvchi ma'lumotlari
        let userId = localStorage.getItem('fx_user') || 'USER_' + Math.floor(Math.random() * 9000 + 1000);
        localStorage.setItem('fx_user', userId);
        let balance = 0;
        let currentPool = [];

        // O'yin bazasi (Serevro va Skinlar bilan)
        const GAME_DATA = {
            mummy: {
                name: "Mummy Crate",
                items: [
                    { name: "Golden Mummy", rarity: "MYTHIC", price: 1500, img: "https://i.ibb.co/3s68KXY/mummy.png" },
                    { name: "White Mummy", rarity: "LEGENDARY", price: 500, img: "https://i.ibb.co/3s68KXY/mummy.png" },
                    { name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png" }
                ]
            },
            glacier: {
                name: "Glacier Crate",
                items: [
                    { name: "M416 Glacier", rarity: "MYTHIC", price: 2000, img: "https://i.ibb.co/tB7P0WJ/fiend.png" },
                    { name: "Glacier Set", rarity: "LEGENDARY", price: 600, img: "https://i.ibb.co/tB7P0WJ/fiend.png" },
                    { name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png" }
                ]
            },
            pharaoh: {
                name: "Pharaoh Crate",
                items: [
                    { name: "Pharaoh X-Suit", rarity: "ULTIMATE", price: 3000, img: "https://i.ibb.co/XSBG6Y0/pharaoh.png" },
                    { name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png" }
                ]
            },
            poseidon: {
                name: "Poseidon Crate",
                items: [
                    { name: "Poseidon X-Suit", rarity: "ULTIMATE", price: 3000, img: "https://i.ibb.co/hR0fH8B/poseidon.png" },
                    { name: "Silver", rarity: "COMMON", price: 10, img: "https://www.pubgmobile.com/common/images/icon_1.png" }
                ]
            }
        };

        async function init() {
            document.getElementById('displayId').innerText = userId;
            const res = await fetch('/api/user/' + userId);
            const data = await res.json();
            balance = data.fxCoin;
            document.getElementById('displayBal').innerText = balance;

            // Render Crates
            const container = document.getElementById('cratesContainer');
            container.innerHTML = '';
            for(let key in GAME_DATA) {
                container.innerHTML += \`
                    <div class="crate" onclick="viewCrate('\${key}')">
                        <div class="crate-name">\${GAME_DATA[key].name}</div>
                        <div style="color:#888; font-size:12px; margin-top:10px;">Cost: 70 Fx</div>
                    </div>
                \`;
            }
        }

        function viewCrate(key) {
            currentPool = GAME_DATA[key].items;
            document.getElementById('modalTitle').innerText = GAME_DATA[key].name;
            document.getElementById('modalItems').innerHTML = currentPool.map(i => \`
                <div class="item-card">
                    <img src="\${i.img}" class="item-img" onerror="this.src='https://www.pubgmobile.com/common/images/icon_1.png'">
                    <div class="item-name">\${i.name}</div>
                </div>
            \`).join('');
            document.getElementById('caseModal').style.display = 'flex';
        }

        async function openCrate(times) {
            const cost = times * 70;
            if(balance < cost) return alert("Hisobingizda FxCoin yetarli emas!");

            await fetch('/api/user/update', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId, amount: -cost })
            });

            // Randomizer logikasi (Silver tushish ehtimoli yuqori)
            let rand = Math.random();
            let winItem = currentPool[currentPool.length - 1]; // Default: Silver
            if(rand < 0.05 && currentPool.length > 2) winItem = currentPool[0]; // Mythic/Ultimate
            else if(rand < 0.2 && currentPool.length > 2) winItem = currentPool[1]; // Legendary

            document.getElementById('winRarity').innerText = winItem.rarity;
            document.getElementById('winImg').src = winItem.img;
            document.getElementById('winName').innerText = winItem.name;
            
            const btn = document.getElementById('sellBtn');
            btn.innerText = "SOTISH (" + winItem.price + " Fx)";
            btn.onclick = () => sellItem(winItem.price);

            document.getElementById('caseModal').style.display = 'none';
            document.getElementById('winModal').style.display = 'flex';
            init(); // Balansni yangilash
        }

        async function sellItem(price) {
            await fetch('/api/user/update', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId, amount: price })
            });
            document.getElementById('winModal').style.display = 'none';
            init();
        }

        function openSettings() {
            let pass = prompt("Maxfiy promokodni kiriting:");
            if(pass === "admin2010") {
                fetch('/api/user/update', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ userId, amount: 10000 })
                }).then(() => {
                    alert("Muvaffaqiyatli! 10,000 FxCoin qo'shildi.");
                    init();
                });
            }
        }

        init();
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server ishladi: Port " + PORT));
