const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. DATABASE CONFIG (MongoDB)
// ==========================================
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pubgm_simulator';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB ulandi!'))
    .catch(err => console.log('MongoDB xatosi:', err));

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 1000 } // Boshlang'ich bonus
});
const User = mongoose.model('User', UserSchema);

// ==========================================
// 2. O'YIN MANTIQI VA KEYSLAR (Backend Data)
// ==========================================
const casesData = {
    pharaoh: {
        name: "Pharaoh X-Suit Case",
        image: "https://placehold.co/300x400/1a1a1a/ffd700?text=Pharaoh\nCrate",
        items: [
            { name: "Pharaoh X-Suit", rarity: "ultimate", price: 3000, chance: 1, img: "https://placehold.co/150/ffd700/000?text=Pharaoh\nX-Suit" },
            { name: "Pharaoh Backpack", rarity: "mythic", price: 500, chance: 5, img: "https://placehold.co/150/ff007f/fff?text=Mythic\nBackpack" },
            { name: "Silver Fragments", rarity: "common", price: 10, chance: 94, img: "https://placehold.co/150/b0bec5/000?text=Silver" }
        ]
    },
    poseidon: {
        name: "Poseidon X-Suit Case",
        image: "https://placehold.co/300x400/1a1a1a/00bfff?text=Poseidon\nCrate",
        items: [
            { name: "Poseidon X-Suit", rarity: "ultimate", price: 3000, chance: 1, img: "https://placehold.co/150/00bfff/000?text=Poseidon\nX-Suit" },
            { name: "Poseidon Glider", rarity: "mythic", price: 500, chance: 5, img: "https://placehold.co/150/ff007f/fff?text=Mythic\nGlider" },
            { name: "Silver Fragments", rarity: "common", price: 10, chance: 94, img: "https://placehold.co/150/b0bec5/000?text=Silver" }
        ]
    },
    mummy: {
        name: "Mummy Case",
        image: "https://placehold.co/300x400/1a1a1a/ffff00?text=Mummy\nCrate",
        items: [
            { name: "Yellow Mummy Set", rarity: "ultimate", price: 3000, chance: 1, img: "https://placehold.co/150/ffff00/000?text=Yellow\nMummy" },
            { name: "Mummy Helmet", rarity: "mythic", price: 500, chance: 5, img: "https://placehold.co/150/ff007f/fff?text=Mythic\nHelmet" },
            { name: "Silver Fragments", rarity: "common", price: 10, chance: 94, img: "https://placehold.co/150/b0bec5/000?text=Silver" }
        ]
    }
};

const getRandomDrop = (caseId) => {
    const items = casesData[caseId].items;
    const rand = Math.random() * 100;
    if (rand <= items[0].chance) return items[0]; // Ultimate (1%)
    if (rand <= items[0].chance + items[1].chance) return items[1]; // Mythic (5%)
    return items[2]; // Common (94%)
};

// ==========================================
// 3. API MARSHRUTLARI (Endpoints)
// ==========================================
app.post('/api/user', async (req, res) => {
    const { userId } = req.body;
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId, balance: 1000 });
        await user.save();
    }
    res.json(user);
});

app.post('/api/open', async (req, res) => {
    const { userId, caseId, amount } = req.body;
    const cost = amount === 10 ? 700 : 70;

    let user = await User.findOne({ userId });
    if (!user || user.balance < cost) return res.status(400).json({ error: "FxCoin yetarli emas!" });

    user.balance -= cost;
    await user.save();

    const drops = [];
    for (let i = 0; i < amount; i++) {
        drops.push(getRandomDrop(caseId));
    }

    res.json({ balance: user.balance, drops });
});

app.post('/api/sell', async (req, res) => {
    const { userId, price } = req.body;
    let user = await User.findOne({ userId });
    if (user) {
        user.balance += parseInt(price);
        await user.save();
        res.json({ balance: user.balance });
    } else {
        res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }
});

app.post('/api/secret', async (req, res) => {
    const { userId, code } = req.body;
    if (code === 'admin2010') {
        let user = await User.findOne({ userId });
        user.balance += 10000;
        await user.save();
        res.json({ success: true, balance: user.balance });
    } else {
        res.status(400).json({ error: "Xato kod!" });
    }
});

app.post('/api/admin/add', async (req, res) => {
    const { targetId, amount } = req.body;
    let user = await User.findOne({ userId: targetId });
    if (user) {
        user.balance += parseInt(amount);
        await user.save();
        res.json({ success: true, message: `${targetId} hisobiga ${amount} Fx qo'shildi.` });
    } else {
        res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }
});

// ==========================================
// 4. FRONTEND (HTML + CSS + JS)
// ==========================================

const htmlContent = `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PUBGM X-Suit Simulator</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
        body { background-color: #0d0d0d; color: #fff; font-family: 'Teko', sans-serif; overflow-x: hidden; }
        
        /* Header */
        header { display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; background: linear-gradient(180deg, #1a1a1a 0%, #000 100%); border-bottom: 2px solid #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.2); }
        .logo { font-size: 28px; font-weight: 600; color: #ffd700; text-shadow: 0 0 10px #ffd700; }
        .user-info { display: flex; align-items: center; gap: 20px; font-size: 20px; }
        .uid-badge { background: #222; padding: 5px 15px; border-radius: 5px; border: 1px solid #444; }
        .balance { background: rgba(255, 215, 0, 0.1); padding: 5px 15px; border-radius: 5px; border: 1px solid #ffd700; color: #ffd700; font-weight: 600; display: flex; align-items: center; gap: 5px;}
        .settings-btn { background: none; border: none; font-size: 24px; cursor: pointer; transition: 0.3s; }
        .settings-btn:hover { transform: rotate(90deg); }

        /* Layout */
        .container { display: flex; height: calc(100vh - 70px); }
        .sidebar { width: 250px; background: #111; padding: 20px; border-right: 1px solid #333; }
        .sidebar h3 { color: #888; font-size: 22px; margin-bottom: 15px; text-transform: uppercase; }
        .sidebar ul { list-style: none; }
        .sidebar ul li { padding: 12px; background: #222; margin-bottom: 10px; cursor: pointer; border-left: 3px solid transparent; transition: 0.3s; font-size: 20px; }
        .sidebar ul li:hover { background: #333; border-left: 3px solid #ffd700; color: #ffd700; }
        
        .main-area { flex: 1; padding: 40px; display: flex; gap: 30px; justify-content: center; flex-wrap: wrap; overflow-y: auto; }
        
        /* Case Cards */
        .case-card { width: 280px; height: 400px; background: #1a1a1a; border-radius: 10px; border: 2px solid #333; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; }
        .case-card:hover { border-color: #ffd700; transform: translateY(-5px); box-shadow: 0 10px 20px rgba(255, 215, 0, 0.2); }
        .case-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
        .case-title { position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.8); padding: 15px; text-align: center; font-size: 24px; color: #ffd700; text-transform: uppercase; }

        /* Modals */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: none; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #111; border: 2px solid #ffd700; padding: 30px; border-radius: 10px; width: 800px; max-width: 90%; position: relative; text-align: center; }
        .close-btn { position: absolute; top: 10px; right: 20px; font-size: 30px; color: #fff; cursor: pointer; }
        
        .items-preview { display: flex; justify-content: center; gap: 15px; margin: 20px 0; flex-wrap: wrap; }
        .item-box { width: 120px; background: #222; padding: 10px; border-radius: 5px; text-align: center; }
        .item-box img { width: 80px; height: 80px; margin-bottom: 10px; }
        .rarity-ultimate { border-bottom: 3px solid #ffd700; box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); }
        .rarity-mythic { border-bottom: 3px solid #ff007f; box-shadow: 0 0 15px rgba(255, 0, 127, 0.4); }
        .rarity-common { border-bottom: 3px solid #b0bec5; }
        
        .action-btns { display: flex; justify-content: center; gap: 20px; margin-top: 20px; }
        button.btn { padding: 10px 30px; font-size: 22px; font-family: 'Teko'; cursor: pointer; border: none; border-radius: 5px; text-transform: uppercase; font-weight: 600; }
        .btn-open { background: #ffd700; color: #000; }
        .btn-open:hover { background: #e6c200; }
        .btn-sell { background: #444; color: #fff; margin-top: 10px; font-size: 18px; width: 100%; }
        .btn-sell:hover { background: #2ecc71; }
        .btn-sell:disabled { background: #222; color: #666; cursor: not-allowed; }

        /* Drop Result Grid */
        .drop-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-top: 20px; }
        .drop-item { animation: popIn 0.5s ease-out forwards; opacity: 0; transform: scale(0.5); }
        @keyframes popIn { to { opacity: 1; transform: scale(1); } }
    </style>
</head>
<body>

    <header>
        <div class="logo">PUBGM SIMULATOR</div>
        <div class="user-info">
            <div class="uid-badge">ID: <span id="uidDisplay">Yuklanmoqda...</span></div>
            <div class="balance">🪙 <span id="balanceDisplay">0</span> Fx</div>
            <button class="settings-btn" onclick="openSettings()">⚙️</button>
        </div>
    </header>

    <div class="container">
        <aside class="sidebar">
            <h3>Menyu</h3>
            <ul>
                <li>UC Xarid qilish</li>
                <li>Inventar</li>
                <li onclick="window.location.href='/admin'">Admin Panel</li>
            </ul>
        </aside>
        
        <main class="main-area" id="casesArea">
            </main>
    </div>

    <div class="modal-overlay" id="caseModal">
        <div class="modal-content">
            <span class="close-btn" onclick="closeModal('caseModal')">&times;</span>
            <h2 id="modalTitle" style="color: #ffd700; font-size: 36px;">Keys</h2>
            
            <div id="modalPreview" class="items-preview"></div>
            <div id="modalDrops" class="drop-grid" style="display: none;"></div>

            <div class="action-btns" id="actionBtns">
                <button class="btn btn-open" onclick="openCase(1)">1x Ochish (70 Fx)</button>
                <button class="btn btn-open" onclick="openCase(10)">10x Ochish (700 Fx)</button>
            </div>
            <div class="action-btns" id="resultBtns" style="display: none;">
                <button class="btn btn-open" onclick="resetModal()">Yana Ochish</button>
            </div>
        </div>
    </div>

    <script>
        // 1. User Logic
        let userId = localStorage.getItem('pubgm_uid');
        let currentBalance = 0;
        let activeCaseId = null;

        if (!userId) {
            userId = '5' + Math.floor(Math.random() * 1000000000);
            localStorage.setItem('pubgm_uid', userId);
        }
        document.getElementById('uidDisplay').innerText = userId;

        async function fetchUser() {
            const res = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            updateBalance(data.balance);
        }

        function updateBalance(amount) {
            currentBalance = amount;
            document.getElementById('balanceDisplay').innerText = amount;
        }

        // 2. Render Cases
        const casesData = ${JSON.stringify(casesData)};
        const casesArea = document.getElementById('casesArea');

        Object.keys(casesData).forEach(key => {
            const c = casesData[key];
            const div = document.createElement('div');
            div.className = 'case-card';
            div.innerHTML = \`
                <img src="\${c.image}" class="case-img">
                <div class="case-title">\${c.name}</div>
            \`;
            div.onclick = () => showCaseModal(key);
            casesArea.appendChild(div);
        });

        // 3. Modal Logic
        function showCaseModal(id) {
            activeCaseId = id;
            const c = casesData[id];
            document.getElementById('modalTitle').innerText = c.name;
            
            const preview = document.getElementById('modalPreview');
            preview.innerHTML = '';
            c.items.forEach(item => {
                preview.innerHTML += \`
                    <div class="item-box rarity-\${item.rarity}">
                        <img src="\${item.img}">
                        <p style="font-size: 16px;">\${item.name}</p>
                        <p style="color:#888; font-size:14px;">\${item.chance}%</p>
                    </div>
                \`;
            });

            resetModal();
            document.getElementById('caseModal').style.display = 'flex';
        }

        function closeModal(id) { document.getElementById(id).style.display = 'none'; }
        
        function resetModal() {
            document.getElementById('modalPreview').style.display = 'flex';
            document.getElementById('modalDrops').style.display = 'none';
            document.getElementById('actionBtns').style.display = 'flex';
            document.getElementById('resultBtns').style.display = 'none';
        }

        // 4. Case Opening
        async function openCase(amount) {
            const cost = amount === 10 ? 700 : 70;
            if (currentBalance < cost) return alert("FxCoin yetarli emas!");

            const res = await fetch('/api/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, caseId: activeCaseId, amount })
            });
            const data = await res.json();
            
            if(data.error) return alert(data.error);
            updateBalance(data.balance);
            showDrops(data.drops);
        }

        function showDrops(drops) {
            document.getElementById('modalPreview').style.display = 'none';
            document.getElementById('actionBtns').style.display = 'none';
            
            const dropGrid = document.getElementById('modalDrops');
            dropGrid.innerHTML = '';
            dropGrid.style.display = 'grid';

            drops.forEach((drop, index) => {
                setTimeout(() => {
                    dropGrid.innerHTML += \`
                        <div class="item-box drop-item rarity-\${drop.rarity}" id="drop-\${index}">
                            <img src="\${drop.img}">
                            <p style="font-size: 16px;">\${drop.name}</p>
                            <button class="btn btn-sell" onclick="sellItem(this, \${drop.price})">Sotish (\${drop.price})</button>
                        </div>
                    \`;
                }, index * 200);
            });

            setTimeout(() => {
                document.getElementById('resultBtns').style.display = 'flex';
            }, drops.length * 200 + 300);
        }

        // 5. Sell Item
        async function sellItem(btn, price) {
            btn.disabled = true;
            btn.innerText = "Sotildi";
            const res = await fetch('/api/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, price })
            });
            const data = await res.json();
            updateBalance(data.balance);
        }

        // 6. Secret Code
        async function openSettings() {
            const code = prompt("Secret Kodni kiriting:");
            if (code) {
                const res = await fetch('/api/secret', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, code })
                });
                const data = await res.json();
                if (data.success) {
                    alert("10,000 FxCoin qo'shildi!");
                    updateBalance(data.balance);
                } else {
                    alert(data.error);
                }
            }
        }

        // Init
        fetchUser();
    </script>
</body>
</html>
`;

const adminHtmlContent = `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>Admin Panel - PUBGM</title>
    <style>
        body { background: #111; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .admin-box { background: #222; padding: 40px; border-radius: 10px; border: 2px solid #ffd700; text-align: center; }
        input { padding: 10px; margin: 10px 0; width: 100%; border-radius: 5px; border: none; font-size: 16px; }
        button { padding: 10px 20px; background: #ffd700; border: none; font-weight: bold; cursor: pointer; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="admin-box">
        <h2 style="color: #ffd700;">Admin Panel (Coin Berish)</h2>
        <input type="text" id="targetId" placeholder="Foydalanuvchi ID si">
        <input type="number" id="amount" placeholder="Coin Miqdori (masalan: 5000)">
        <button onclick="addCoin()">Yuborish</button>
        <p id="msg" style="margin-top: 15px; color: #2ecc71;"></p>
        <br><a href="/" style="color:#aaa; text-decoration: none;">&larr; Asosiy sahifaga qaytish</a>
    </div>
    <script>
        async function addCoin() {
            const targetId = document.getElementById('targetId').value;
            const amount = document.getElementById('amount').value;
            const res = await fetch('/api/admin/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId, amount })
            });
            const data = await res.json();
            document.getElementById('msg').innerText = data.success ? data.message : data.error;
        }
    </script>
</body>
</html>
`;

// Routes for Serving Pages
app.get('/', (req, res) => res.send(htmlContent));
app.get('/admin', (req, res) => res.send(adminHtmlContent));

// ==========================================
// 5. SERVER START
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`Server \${PORT}-portda ishga tushdi!\`);
});
