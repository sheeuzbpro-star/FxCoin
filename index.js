const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// --- KONFIGURATSIYA ---
const PORT = process.env.PORT || 3000;
const MONGO_URI = "mongodb+srv://admin:admin2010@cluster0.mongodb.net/pubgm_sim?retryWrites=true&w=majority"; // O'zingizni bazangizga almashtiring

app.use(express.json());
app.use(express.static('public'));

// --- DATABASE MODEL ---
mongoose.connect(MONGO_URI).then(() => console.log("MongoDB ulandi")).catch(err => console.log("DB Xatosi:", err));

const UserSchema = new mongoose.Schema({
    userId: String,
    balance: { type: Number, default: 1000 },
    inventory: Array
});
const User = mongoose.model('User', UserSchema);

// --- API ROUTES ---
app.post('/api/user', async (req, res) => {
    let user = await User.findOne({ userId: req.body.userId });
    if (!user) user = await User.create({ userId: req.body.userId });
    res.json(user);
});

app.post('/api/add-balance', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { balance: amount } }, { new: true });
    res.json(user);
});

// --- FRONTEND (HTML + CSS + JS) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buldrop PUBGM Simulator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #0d0d12; color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; }
        .gold-text { color: #f3ba2f; }
        .bg-card { background: linear-gradient(180deg, #1a1a24 0%, #111118 100%); border: 1px solid #2d2d3d; }
        .sidebar { background: #13131a; border-right: 1px solid #2d2d3d; height: 100vh; position: fixed; width: 240px; }
        .main-content { margin-left: 240px; padding: 20px; }
        .case-card { transition: transform 0.3s; cursor: pointer; position: relative; overflow: hidden; border-radius: 12px; }
        .case-card:hover { transform: translateY(-5px); border-color: #f3ba2f; }
        .modal { display: none; position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(5px); }
        .modal-content { background: #1a1a24; margin: 5% auto; padding: 20px; width: 80%; max-width: 1000px; border-radius: 15px; border: 1px solid #f3ba2f33; }
        .skin-item { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; text-align: center; border-bottom: 3px solid #8e44ad; }
        .rarity-mythic { border-bottom-color: #ff4757; }
        .rarity-ultimate { border-bottom-color: #f3ba2f; }
        .btn-open { background: linear-gradient(90deg, #f3ba2f 0%, #e1a924 100%); color: black; font-weight: bold; padding: 12px 30px; border-radius: 5px; }
        .inventory-item { width: 100px; height: 100px; background: #222; margin: 5px; display: inline-block; }
    </style>
</head>
<body>

    <div class="sidebar p-5 hidden md:block">
        <h1 class="text-2xl font-bold gold-text mb-10"><i class="fas fa-bolt"></i> BULLDROP</h1>
        <nav class="space-y-4">
            <a href="#" class="block p-3 bg-yellow-500/10 text-yellow-500 rounded"><i class="fas fa-box-open mr-2"></i> Barcha Keyslar</a>
            <a href="#" class="block p-3 hover:bg-white/5 rounded text-gray-400"><i class="fas fa-shopping-cart mr-2"></i> UC Xarid qilish</a>
            <a href="#" class="block p-3 hover:bg-white/5 rounded text-gray-400"><i class="fas fa-history mr-2"></i> Live Drops</a>
            <a href="#" onclick="openSettings()" class="block p-3 hover:bg-white/5 rounded text-gray-400"><i class="fas fa-cog mr-2"></i> Sozlamalar</a>
        </nav>
    </div>

    <div class="main-content">
        <header class="flex justify-between items-center mb-10">
            <div class="search-bar">
                <input type="text" placeholder="Keys qidirish..." class="bg-[#1a1a24] border border-gray-700 px-4 py-2 rounded-lg w-64">
            </div>
            <div class="flex items-center gap-6">
                <div class="text-right">
                    <p class="text-gray-400 text-xs">Sizning Balansingiz</p>
                    <p class="gold-text font-bold text-xl"><i class="fas fa-coins"></i> <span id="balance">0</span> Fx</p>
                </div>
                <div class="flex items-center gap-2 bg-[#1a1a24] p-2 rounded-lg border border-gray-700">
                    <img src="https://i.ibb.co/Vv3xL9v/avatar.png" class="w-8 h-8 rounded-full border border-yellow-500" id="user-avatar">
                    <span id="display-id" class="text-sm font-medium">ID: 00000</span>
                </div>
            </div>
        </header>

        <div class="w-full h-48 rounded-2xl mb-10 overflow-hidden relative border border-purple-500/30">
            <img src="https://images3.alphacoders.com/112/1125235.jpg" class="w-full h-full object-cover opacity-60">
            <div class="absolute inset-0 flex flex-col justify-center px-10 bg-gradient-to-r from-black to-transparent">
                <h2 class="text-3xl font-bold">X-Suit Mavsumi boshlandi!</h2>
                <p class="text-gray-300">Yangi Pharaoh va Poseidon keyslarini oching.</p>
                <button class="mt-4 bg-yellow-500 text-black px-6 py-2 rounded font-bold w-max">Promo: TRICKY</button>
            </div>
        </div>

        <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
            <span class="w-2 h-8 bg-yellow-500 rounded"></span> All Cases PUBGM
        </h3>

        <div id="cases-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            </div>
    </div>

    <div id="caseModal" class="modal">
        <div class="modal-content relative">
            <span onclick="closeModal()" class="absolute right-5 top-5 text-2xl cursor-pointer text-gray-500 hover:text-white">&times;</span>
            <div id="modal-body" class="text-center">
                </div>
        </div>
    </div>

    <script>
        // --- DATA ---
        const cases = [
            { id: 1, name: 'Pharaoh X-Suit', price: 70, img: 'https://i.ibb.co/6P0qMhK/pharaoh.jpg', color: '#f3ba2f' },
            { id: 2, name: 'Poseidon God', price: 70, img: 'https://i.ibb.co/FhN8Fp6/poseidon.jpg', color: '#2f91f3' },
            { id: 3, name: 'Mummy Case', price: 50, img: 'https://i.ibb.co/YyY4R0Q/mummy.jpg', color: '#e2e2e2' },
            { id: 4, name: 'Silvanus Suit', price: 80, img: 'https://i.ibb.co/h7n0D3v/silvanus.jpg', color: '#2ecc71' },
            { id: 5, name: 'Blood Raven', price: 90, img: 'https://i.ibb.co/9rB5W3b/raven.jpg', color: '#e74c3c' },
            // ... jami 25 ta keys qo'shish mumkin
        ];

        // Har bir keys ichidagi itemlar
        const items = [
            { name: 'Ultimate Skin', price: 5000, rarity: 'ultimate', img: 'https://i.ibb.co/5L3p9d4/skin1.png' },
            { name: 'Mythic Dress', price: 1500, rarity: 'mythic', img: 'https://i.ibb.co/VWLmXn6/skin2.png' },
            { name: 'Legendary Pan', price: 500, rarity: 'legendary', img: 'https://i.ibb.co/9V5xH7S/skin3.png' },
            { name: 'Silver (50x)', price: 10, rarity: 'rare', img: 'https://i.ibb.co/Vgr3t61/silver.png' }
        ];

        let currentUser = null;

        // --- CORE LOGIC ---
        async function initUser() {
            let id = localStorage.getItem('pubgm_id') || Math.floor(10000 + Math.random() * 90000);
            localStorage.setItem('pubgm_id', id);
            const res = await fetch('/api/user', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: id })
            });
            currentUser = await res.json();
            updateUI();
        }

        function updateUI() {
            document.getElementById('balance').innerText = currentUser.balance;
            document.getElementById('display-id').innerText = 'ID: ' + currentUser.userId;
        }

        function renderCases() {
            const grid = document.getElementById('cases-grid');
            // Bizga 25 ta keys kerakligi uchun massivni takrorlaymiz
            const fullList = [...cases, ...cases, ...cases, ...cases, ...cases].slice(0, 25);
            
            grid.innerHTML = fullList.map((c, i) => \`
                <div class="case-card bg-card border p-4 text-center" onclick="openCaseMenu(\${i % cases.length})">
                    <img src="\${c.img}" class="w-full h-32 object-contain mb-4">
                    <p class="font-bold text-sm mb-2">\${c.name}</p>
                    <div class="flex justify-center items-center gap-1 text-yellow-500 font-bold">
                        <i class="fas fa-coins text-xs"></i> \${c.price} Fx
                    </div>
                </div>
            \`).join('');
        }

        function openCaseMenu(index) {
            const c = cases[index];
            const modal = document.getElementById('caseModal');
            const body = document.getElementById('modal-body');
            modal.style.display = 'block';
            
            body.innerHTML = \`
                <h2 class="text-2xl font-bold mb-6">\${c.name} Contents</h2>
                <div class="grid grid-cols-4 gap-4 mb-8">
                    \${items.map(item => \`
                        <div class="skin-item rarity-\${item.rarity}">
                            <img src="\${item.img}" class="h-20 mx-auto">
                            <p class="text-xs mt-2">\${item.name}</p>
                        </div>
                    \`).join('')}
                </div>
                <div class="flex justify-center gap-4">
                    <button onclick="spin(1, \${c.price})" class="btn-open">1x OCHISH (\${c.price} Fx)</button>
                    <button onclick="spin(10, \${c.price * 10})" class="btn-open">10x OCHISH (\${c.price * 10} Fx)</button>
                </div>
            \`;
        }

        async function spin(times, totalCost) {
            if(currentUser.balance < totalCost) return alert("Mablag' yetarli emas!");

            // Balansni kamaytirish
            const res = await fetch('/api/add-balance', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: currentUser.userId, amount: -totalCost })
            });
            currentUser = await res.json();
            updateUI();

            // Tasodifiy item tushishi
            const wonItem = items[Math.floor(Math.random() * items.length)];
            
            alert("Siz yutdingiz: " + wonItem.name + " (" + wonItem.price + " Fx ga sotildi)");
            
            // Avtomatik sotish mantiqi (Buldrop kabi)
            const res2 = await fetch('/api/add-balance', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: currentUser.userId, amount: wonItem.price })
            });
            currentUser = await res2.json();
            updateUI();
        }

        function openSettings() {
            const code = prompt("Secret Code kiriting:");
            if(code === 'admin2010') {
                fetch('/api/add-balance', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ userId: currentUser.userId, amount: 10000 })
                }).then(() => {
                    alert("10,000 Fx qo'shildi!");
                    location.reload();
                });
            }
        }

        function closeModal() { document.getElementById('caseModal').style.display = 'none'; }
        
        window.onload = () => { initUser(); renderCases(); };
    </script>
</body>
</html>
    `);
});

// --- ADMIN PAGE ---
app.get('/admin', (req, res) => {
    res.send(\`
        <body style="background: #111; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh;">
            <div style="background: #222; padding: 40px; border-radius: 10px; text-align: center;">
                <h2>BULLDROP ADMIN</h2>
                <input id="uid" placeholder="Foydalanuvchi ID" style="padding: 10px; margin: 10px; width: 250px;"><br>
                <input id="amt" placeholder="Fx miqdori" style="padding: 10px; margin: 10px; width: 250px;"><br>
                <button onclick="send()" style="padding: 10px 40px; background: orange; border: none; cursor: pointer;">Yuborish</button>
                <script>
                    async function send() {
                        const userId = document.getElementById('uid').value;
                        const amount = parseInt(document.getElementById('amt').value);
                        await fetch('/api/add-balance', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ userId, amount })
                        });
                        alert("Bajarildi!");
                    }
                </script>
            </div>
        </body>
    \`);
});

app.listen(PORT, () => console.log(\`Server \${PORT}-portda yonishga tayyor!\`));
