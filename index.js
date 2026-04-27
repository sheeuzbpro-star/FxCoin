const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE SETUP ---
// Render.com uchun MONGO_URI ni Environment Variables'ga qo'shishingiz kerak.
// Test uchun quyidagi vaqtinchalik ulanish (agar env bo'lmasa):
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://test:test@cluster.mongodb.net/pubgm_sim?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("🔥 MongoDB connected!"))
    .catch(err => console.error("❌ MongoDB Error:", err));

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    balance: { type: Number, default: 500 },
    inventory: Array
});
const User = mongoose.model('User', UserSchema);

app.use(express.json());
app.use(express.static('public'));

// --- GAME DATA ---
const ITEMS = {
    pharaoh: [
        { name: "Pharaoh X-Suit (Level 7)", price: 5000, rarity: "ultimate", img: "https://i.ibb.co/L6vV7xV/pharaoh.png" },
        { name: "Golden Sarcophagus", price: 1200, rarity: "mythic", img: "https://i.ibb.co/pW6z6Gq/box.png" },
        { name: "Silver", price: 10, rarity: "common", img: "https://i.ibb.co/mS5Tz5k/silver.png" }
    ],
    poseidon: [
        { name: "Poseidon X-Suit", price: 4500, rarity: "ultimate", img: "https://i.ibb.co/hK8XwzN/poseidon.png" },
        { name: "Trident Spear", price: 1000, rarity: "mythic", img: "https://i.ibb.co/pW6z6Gq/box.png" },
        { name: "Silver", price: 10, rarity: "common", img: "https://i.ibb.co/mS5Tz5k/silver.png" }
    ],
    mummy: [
        { name: "White Mummy Set", price: 3000, rarity: "mythic", img: "https://i.ibb.co/kH7Q6z3/mummy.png" },
        { name: "Yellow Mummy Set", price: 2500, rarity: "mythic", img: "https://i.ibb.co/kH7Q6z3/mummy.png" },
        { name: "Silver", price: 10, rarity: "common", img: "https://i.ibb.co/mS5Tz5k/silver.png" }
    ]
};

// --- API ROUTES ---

// Foydalanuvchini olish yoki yaratish
app.post('/api/user', async (req, res) => {
    const { userId } = req.body;
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId, balance: 1000, inventory: [] });
        await user.save();
    }
    res.json(user);
});

// Keys ochish mantiqi
app.post('/api/open', async (req, res) => {
    const { userId, caseType, count } = req.body;
    const cost = count === 1 ? 70 : 700;
    const user = await User.findOne({ userId });

    if (user.balance < cost) return res.status(400).json({ error: "Mablag' yetarli emas!" });

    let rewards = [];
    const pool = ITEMS[caseType];

    for (let i = 0; i < count; i++) {
        let rand = Math.random() * 100;
        if (rand < 2) rewards.push(pool[0]); // 2% Ultimate
        else if (rand < 15) rewards.push(pool[1]); // 13% Mythic
        else rewards.push(pool[2]); // Silver
    }

    user.balance -= cost;
    user.inventory.push(...rewards);
    await user.save();
    res.json({ rewards, newBalance: user.balance });
});

// Sotish mantiqi
app.post('/api/sell', async (req, res) => {
    const { userId, itemIndex } = req.body;
    const user = await User.findOne({ userId });
    const item = user.inventory[itemIndex];
    if (item) {
        user.balance += item.price;
        user.inventory.splice(itemIndex, 1);
        await user.save();
    }
    res.json({ newBalance: user.balance });
});

// Secret Code (Admin2010)
app.post('/api/secret', async (req, res) => {
    const { userId, code } = req.body;
    if (code === "admin2010") {
        const user = await User.findOneAndUpdate({ userId }, { $inc: { balance: 10000 } }, { new: true });
        return res.json({ success: true, balance: user.balance });
    }
    res.status(400).json({ error: "Kod noto'g'ri!" });
});

// Admin Panel Logic
app.post('/api/admin/add', async (req, res) => {
    const { targetId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId: targetId }, { $inc: { balance: parseInt(amount) } }, { new: true });
    res.json({ success: !!user });
});

// --- FRONTEND LAYOUT (HTML/CSS/JS) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PUBGM Simulator | FxCoin</title>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --dark: #0b0b0b; --gray: #1a1a1a; }
        body { background: var(--dark); color: white; font-family: 'Rajdhani', sans-serif; margin: 0; overflow-x: hidden; }
        
        /* Header */
        header { background: #000; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--gold); position: sticky; top: 0; z-index: 100; }
        .balance-box { display: flex; align-items: center; gap: 10px; background: #222; padding: 5px 15px; border-radius: 20px; border: 1px solid var(--gold); }
        .coin-icon { color: var(--gold); font-weight: bold; }

        /* Main Layout */
        .container { display: flex; min-height: 100vh; }
        .sidebar { width: 250px; background: var(--gray); border-right: 1px solid #333; padding: 20px; }
        .main-content { flex: 1; padding: 40px; }

        .nav-item { padding: 15px; background: #252525; margin-bottom: 10px; border-radius: 8px; cursor: pointer; transition: 0.3s; text-align: center; border-left: 4px solid transparent; }
        .nav-item:hover { background: #333; border-left-color: var(--gold); }

        /* Case Cards */
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 25px; }
        .case-card { background: linear-gradient(145deg, #1a1a1a, #000); border: 1px solid #333; border-radius: 15px; padding: 20px; text-align: center; transition: 0.4s; position: relative; overflow: hidden; cursor: pointer; }
        .case-card:hover { transform: translateY(-10px); border-color: var(--gold); box-shadow: 0 0 20px rgba(212, 175, 55, 0.2); }
        .case-card img { width: 100%; height: 200px; object-fit: contain; }
        .case-card h3 { margin: 15px 0; color: var(--gold); text-transform: uppercase; }

        /* Modal */
        #modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; }
        .modal-content { background: #111; width: 80%; max-width: 900px; padding: 30px; border-radius: 20px; border: 2px solid var(--gold); text-align: center; }
        .reward-anim { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 20px 0; }
        .reward-item { width: 120px; padding: 10px; background: #222; border-radius: 10px; border-bottom: 3px solid gray; }
        .reward-item.ultimate { border-color: #ff3e3e; box-shadow: 0 0 15px #ff3e3e; }
        .reward-item.mythic { border-color: #ff00ff; }
        .reward-item img { width: 80px; }

        .btn { background: var(--gold); color: black; border: none; padding: 12px 25px; font-weight: bold; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px; transition: 0.3s; }
        .btn:hover { background: #b8962d; transform: scale(1.05); }
        .btn-secondary { background: #333; color: white; }

        /* Admin Page Style */
        .admin-page { padding: 50px; max-width: 500px; margin: auto; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #222; border: 1px solid var(--gold); color: white; border-radius: 5px; }
    </style>
</head>
<body>

<header>
    <div id="user-id-display">ID: Loading...</div>
    <div style="display: flex; gap: 20px; align-items: center;">
        <div class="balance-box">
            <span class="coin-icon">Fx</span>
            <span id="balance">0</span>
        </div>
        <button class="btn-secondary" onclick="openSettings()">⚙️</button>
    </div>
</header>

<div class="container" id="app-body">
    <div class="sidebar">
        <h3 style="color: var(--gold)">MEnu</h3>
        <div class="nav-item" onclick="alert('Tez kunda...')">🛒 UC Xarid Qilish</div>
        <div class="nav-item" onclick="showInventory()">🎒 Inventar</div>
    </div>

    <div class="main-content">
        <h2 style="margin-bottom: 30px;">Premium Keyslar</h2>
        <div class="grid">
            <div class="case-card" onclick="openCaseModal('pharaoh')">
                <img src="https://i.ibb.co/L6vV7xV/pharaoh.png">
                <h3>Pharaoh X-Suit</h3>
                <p>70 FxCoin</p>
            </div>
            <div class="case-card" onclick="openCaseModal('poseidon')">
                <img src="https://i.ibb.co/hK8XwzN/poseidon.png">
                <h3>Poseidon X-Suit</h3>
                <p>70 FxCoin</p>
            </div>
            <div class="case-card" onclick="openCaseModal('mummy')">
                <img src="https://i.ibb.co/kH7Q6z3/mummy.png">
                <h3>Mummy Case</h3>
                <p>70 FxCoin</p>
            </div>
        </div>
    </div>
</div>

<div id="modal">
    <div class="modal-content">
        <h2 id="modal-title">Case Opening</h2>
        <div id="reward-display" class="reward-anim"></div>
        <div id="modal-actions">
            <button class="btn" onclick="spin(1)">1x Ochish (70 Fx)</button>
            <button class="btn" onclick="spin(10)">10x Ochish (700 Fx)</button>
            <button class="btn btn-secondary" onclick="closeModal()">Yopish</button>
        </div>
    </div>
</div>

<script>
    let currentUserId = localStorage.getItem('pubgm_id') || 'ID' + Math.floor(Math.random()*999999);
    localStorage.setItem('pubgm_id', currentUserId);
    let selectedCase = '';

    async function initUser() {
        const res = await fetch('/api/user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: currentUserId })
        });
        const data = await res.json();
        document.getElementById('user-id-display').innerText = 'ID: ' + data.userId;
        document.getElementById('balance').innerText = data.balance;
    }

    function openCaseModal(type) {
        selectedCase = type;
        document.getElementById('modal-title').innerText = type.toUpperCase() + " CASE";
        document.getElementById('reward-display').innerHTML = '<p>Buyumlar: X-Suit, Skinlar, Silver...</p>';
        document.getElementById('modal').style.display = 'flex';
    }

    async function spin(count) {
        const res = await fetch('/api/open', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: currentUserId, caseType: selectedCase, count })
        });
        const data = await res.json();
        if(data.error) return alert(data.error);

        document.getElementById('balance').innerText = data.newBalance;
        const display = document.getElementById('reward-display');
        display.innerHTML = '';

        data.rewards.forEach(item => {
            const div = document.createElement('div');
            div.className = 'reward-item ' + item.rarity;
            div.innerHTML = \`<img src="\${item.img}"><br><small>\${item.name}</small>\`;
            display.appendChild(div);
        });
    }

    async function openSettings() {
        const code = prompt("Secret Kodni kiriting:");
        if(code) {
            const res = await fetch('/api/secret', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: currentUserId, code })
            });
            const data = await res.json();
            if(data.success) {
                alert("10,000 FxCoin qo'shildi!");
                document.getElementById('balance').innerText = data.balance;
            } else {
                alert("Xato kod!");
            }
        }
    }

    async function showInventory() {
        const res = await fetch('/api/user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: currentUserId })
        });
        const user = await res.json();
        let invHtml = "<h2>🎒 Inventar</h2><div class='grid'>";
        user.inventory.forEach((item, index) => {
            invHtml += \`
                <div class="case-card">
                    <img src="\${item.img}">
                    <h4>\${item.name}</h4>
                    <button class="btn" onclick="sellItem(\${index})">Sotish (\${item.price} Fx)</button>
                </div>\`;
        });
        invHtml += "</div><button class='btn btn-secondary' onclick='location.reload()'>Orqaga</button>";
        document.getElementById('app-body').innerHTML = invHtml;
    }

    async function sellItem(index) {
        const res = await fetch('/api/sell', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: currentUserId, itemIndex: index })
        });
        const data = await res.json();
        document.getElementById('balance').innerText = data.newBalance;
        showInventory();
    }

    function closeModal() { document.getElementById('modal').style.display = 'none'; }

    initUser();
</script>
</body>
</html>
    `);
});

// Admin Sahifasi
app.get('/admin', (req, res) => {
    res.send(`
        <body style="background: #000; color: gold; font-family: sans-serif; text-align:center;">
            <h1>Admin Panel</h1>
            <input id="tid" placeholder="Foydalanuvchi ID">
            <input id="amt" placeholder="FxCoin Miqdori">
            <button onclick="send()">Yuborish</button>
            <script>
                async function send() {
                    const res = await fetch('/api/admin/add', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ targetId: document.getElementById('tid').value, amount: document.getElementById('amt').value })
                    });
                    const data = await res.json();
                    alert(data.success ? "Yuborildi!" : "Xatolik!");
                }
            </script>
        </body>
    `);
});

app.listen(PORT, () => console.log(\`🚀 Server running on port \${PORT}\`));
