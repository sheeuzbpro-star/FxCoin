const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
// Baza ulanishini o'zingiznikiga almashtiring
const MONGO_URI = "mongodb+srv://admin:admin2010@cluster0.mongodb.net/pubgm_sim?retryWrites=true&w=majority"; 

app.use(express.json());

// --- MONGODB ---
mongoose.connect(MONGO_URI).then(() => console.log("DB Ulandi")).catch(err => console.log("DB Xato:", err));
const User = mongoose.model('User', new mongoose.Schema({
    userId: String,
    balance: { type: Number, default: 1000 }
}));

// --- API ROUTES ---
app.post('/api/user', async (req, res) => {
    let user = await User.findOne({ userId: req.body.userId });
    if (!user) user = await User.create({ userId: req.body.userId });
    res.json(user);
});

app.post('/api/balance', async (req, res) => {
    const user = await User.findOneAndUpdate(
        { userId: req.body.userId }, 
        { $inc: { balance: req.body.amount } }, 
        { new: true }
    );
    res.json(user);
});

// --- FRONTEND ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FX-LOOT | PUBGM Cases</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #0b0b0f; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .gold-text { color: #f3ba2f; }
        .bg-header { background-color: #121217; border-bottom: 1px solid #1f1f27; }
        .case-card { 
            background: linear-gradient(180deg, #181820 0%, #111116 100%); 
            border: 1px solid #23232c; 
            border-radius: 12px; 
            transition: all 0.3s ease; 
        }
        .case-card:hover { transform: translateY(-5px); border-color: #f3ba2f; box-shadow: 0 10px 20px rgba(243, 186, 47, 0.1); }
        .btn-gold { background: linear-gradient(90deg, #f3ba2f 0%, #d49f1c 100%); color: #000; font-weight: 700; transition: 0.2s; }
        .btn-gold:hover { filter: brightness(1.1); }
        .btn-dark { background-color: #1f1f27; color: #8e8e9e; font-weight: 600; transition: 0.2s; }
        .btn-dark:hover { background-color: #2a2a35; color: #fff; }
        .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); z-index: 50; }
    </style>
</head>
<body class="antialiased">

    <header class="bg-header px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <h1 class="text-2xl font-black gold-text tracking-wider">FX-LOOT</h1>
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-3 bg-[#181820] px-4 py-2 rounded-lg border border-[#23232c]">
                <span class="text-sm text-gray-400" id="userIdDisplay">USER_0000</span>
                <div class="h-6 w-[1px] bg-gray-700"></div>
                <span class="font-bold gold-text flex items-center gap-2">
                    <i class="fas fa-coins"></i> <span id="balanceDisplay">0</span> Fx
                </span>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8">
        <h2 class="text-xl font-bold mb-6 border-l-4 border-[#f3ba2f] pl-3">Barcha Keyslar</h2>
        
        <div id="casesGrid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            </div>
    </main>

    <div id="caseModal" class="modal flex items-center justify-center">
        <div class="bg-[#121217] w-full max-w-2xl rounded-2xl border border-[#23232c] p-6 relative">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-500 hover:text-white text-xl"><i class="fas fa-times"></i></button>
            
            <div class="text-center mb-8">
                <img id="modalImg" src="" class="h-32 mx-auto mb-4 drop-shadow-2xl">
                <h3 id="modalTitle" class="text-2xl font-bold gold-text uppercase"></h3>
            </div>

            <div id="spinArea" class="bg-[#0b0b0f] h-32 rounded-xl mb-8 flex items-center justify-center border border-[#1f1f27] overflow-hidden relative">
                <p id="spinResult" class="text-gray-500 text-lg">Keysni ochish uchun tugmani bosing</p>
            </div>

            <div class="flex justify-center gap-4">
                <button onclick="openCrate(1)" class="btn-gold px-8 py-3 rounded-lg w-48" id="btn1x"></button>
                <button onclick="openCrate(10)" class="btn-dark px-8 py-3 rounded-lg w-48" id="btn10x"></button>
            </div>
        </div>
    </div>

    <script>
        // --- 1. MUKAMMAL MA'LUMOTLAR BAZASI (JSON/Array) ---
        // Rasmlar o'rniga haqiqiy linklarni qo'yishingiz mumkin. Hozircha yuqori sifatli placeholder'lar qoyildi.
        const cases = [
            { id: 1, name: "Mummy Crate", price: 70, img: "https://i.ibb.co/YyY4R0Q/mummy.jpg" },
            { id: 2, name: "Glacier Crate", price: 70, img: "https://i.ibb.co/XyH5v1h/glacier.jpg" },
            { id: 3, name: "Pharaoh Crate", price: 70, img: "https://i.ibb.co/6P0qMhK/pharaoh.jpg" },
            { id: 4, name: "Poseidon Crate", price: 70, img: "https://i.ibb.co/FhN8Fp6/poseidon.jpg" },
            { id: 5, name: "Avalanche Crate", price: 70, img: "https://i.ibb.co/Vv3xL9v/avatar.png" },
            { id: 6, name: "Silvanus Crate", price: 70, img: "https://i.ibb.co/h7n0D3v/silvanus.jpg" },
            { id: 7, name: "Stygian Crate", price: 70, img: "https://i.ibb.co/Vv3xL9v/avatar.png" },
            { id: 8, name: "Blood Raven", price: 70, img: "https://i.ibb.co/9rB5W3b/raven.jpg" },
            { id: 9, name: "Godzilla Crate", price: 70, img: "https://i.ibb.co/Vv3xL9v/avatar.png" },
            { id: 10, name: "Joker Crate", price: 70, img: "https://i.ibb.co/Vv3xL9v/avatar.png" }
        ];

        // Keys ichidan tushadigan narsalar mantiqi
        const lootPool = [
            { name: "Mythic Item", value: 3000, chance: 0.05, color: "#ff4757" },
            { name: "Legendary Item", value: 500, chance: 0.20, color: "#eccc68" },
            { name: "Epic Item", value: 50, chance: 0.35, color: "#a29bfe" },
            { name: "Silver (20x)", value: 10, chance: 0.40, color: "#ced6e0" }
        ];

        // --- 2. FRONTEND MANTIQI (JS) ---
        let user = null;
        let currentCase = null;

        async function init() {
            let uid = localStorage.getItem('fx_uid');
            if(!uid) {
                uid = 'USER_' + Math.floor(1000 + Math.random() * 9000);
                localStorage.setItem('fx_uid', uid);
            }
            
            const res = await fetch('/api/user', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: uid })
            });
            user = await res.json();
            updateUI();
            renderCases();
        }

        function updateUI() {
            document.getElementById('userIdDisplay').innerText = user.userId;
            document.getElementById('balanceDisplay').innerText = user.balance;
        }

        function renderCases() {
            const grid = document.getElementById('casesGrid');
            grid.innerHTML = cases.map(c => \`
                <div class="case-card p-4 flex flex-col items-center">
                    <img src="\${c.img}" alt="\${c.name}" class="h-24 object-contain mb-4 hover:scale-110 transition-transform">
                    <h3 class="font-bold text-sm text-yellow-500 uppercase mb-3 text-center">\${c.name}</h3>
                    <button onclick="openModal(\${c.id})" class="btn-gold w-full py-2 rounded mb-2 text-sm">1x - \${c.price} Fx</button>
                    <button onclick="openModal(\${c.id})" class="btn-dark w-full py-2 rounded text-sm">10x - \${c.price * 10} Fx</button>
                </div>
            \`).join('');
        }

        function openModal(id) {
            currentCase = cases.find(c => c.id === id);
            document.getElementById('modalTitle').innerText = currentCase.name;
            document.getElementById('modalImg').src = currentCase.img;
            document.getElementById('btn1x').innerText = \`1x - \${currentCase.price} Fx\`;
            document.getElementById('btn10x').innerText = \`10x - \${currentCase.price * 10} Fx\`;
            document.getElementById('spinResult').innerHTML = "Keysni ochish uchun tugmani bosing";
            document.getElementById('caseModal').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('caseModal').style.display = 'none';
            currentCase = null;
        }

        function getRandomLoot() {
            const rand = Math.random();
            let cumulative = 0;
            for (let item of lootPool) {
                cumulative += item.chance;
                if (rand <= cumulative) return item;
            }
            return lootPool[lootPool.length - 1];
        }

        async function openCrate(amount) {
            const cost = currentCase.price * amount;
            if (user.balance < cost) {
                document.getElementById('spinResult').innerHTML = "<span class='text-red-500 font-bold'>Mablag' yetarli emas!</span>";
                return;
            }

            // Balansni yechib olish
            let res = await fetch('/api/balance', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: user.userId, amount: -cost })
            });
            user = await res.json();
            updateUI();

            document.getElementById('spinResult').innerHTML = "<i class='fas fa-spinner fa-spin text-3xl gold-text'></i>";

            setTimeout(async () => {
                let totalWin = 0;
                let resultsHTML = "";
                
                for(let i=0; i<amount; i++) {
                    const win = getRandomLoot();
                    totalWin += win.value;
                    resultsHTML += \`<span style="color: \${win.color}" class="font-bold">\${win.name}</span> \`;
                }

                // Yutuqni qayta balansga qo'shish (Sotish)
                res = await fetch('/api/balance', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ userId: user.userId, amount: totalWin })
                });
                user = await res.json();
                updateUI();

                if(amount === 1) {
                    document.getElementById('spinResult').innerHTML = \`
                        <div class="text-center">
                            <p class="text-sm text-gray-400">Sizga tushdi:</p>
                            <p class="text-xl">\${resultsHTML}</p>
                            <p class="text-green-400 font-bold mt-2">+\${totalWin} Fx</p>
                        </div>
                    \`;
                } else {
                    document.getElementById('spinResult').innerHTML = \`
                        <div class="text-center">
                            <p class="text-green-400 font-bold text-xl mb-1">Umumiy yutuq: +\${totalWin} Fx</p>
                            <p class="text-xs text-gray-500 max-w-md mx-auto">\${resultsHTML}</p>
                        </div>
                    \`;
                }
            }, 1000);
        }

        window.onload = init;
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server ishladi!"));
