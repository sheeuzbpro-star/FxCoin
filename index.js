const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pubgm_simulator';
mongoose.connect(mongoURI).then(() => console.log('MongoDB ulandi!')).catch(err => console.log(err));

const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 5000 }
}));

// 2. DATA: 25 TA KEYS
const casesData = {};
const suitNames = [
    "Pharaoh", "Poseidon", "Avalanche", "Silvanus", "Stygian", "Irradiant", "Galadria", "Mummy", 
    "Godzilla", "Kong", "Joker", "Blood Raven", "Fiend Hunter", "Arcane", "Ignis", "Glacier", 
    "Dragon", "Samurai", "Cyber", "Neon", "Void", "Shadow", "Raptor", "Inferno", "Titan"
];

suitNames.forEach((name, index) => {
    casesData[`case_${index}`] = {
        name: `${name} Crate`,
        image: `https://placehold.co/300x400/1a1a1a/ffd700?text=${name}+Crate`,
        items: [
            { name: `${name} Set`, rarity: "ultimate", price: 5000, chance: 0.5, img: `https://placehold.co/150/ffd700/000?text=${name}+Suit` },
            { name: `${name} Mask`, rarity: "mythic", price: 800, chance: 4.5, img: `https://placehold.co/150/ff007f/fff?text=${name}+Mask` },
            { name: "Silver Fragments", rarity: "common", price: 10, chance: 95, img: "https://placehold.co/150/b0bec5/000?text=Silver" }
        ]
    };
});

// 3. API
app.post('/api/user', async (req, res) => {
    let user = await User.findOne({ userId: req.body.userId });
    if (!user) user = await User.create({ userId: req.body.userId });
    res.json(user);
});

app.post('/api/open', async (req, res) => {
    const { userId, caseId, amount } = req.body;
    const cost = amount === 10 ? 700 : 70;
    let user = await User.findOne({ userId });
    if (!user || user.balance < cost) return res.status(400).json({ error: "Mablag' yetarli emas!" });

    user.balance -= cost;
    await user.save();

    const drops = [];
    const items = casesData[caseId].items;
    for (let i = 0; i < amount; i++) {
        const rand = Math.random() * 100;
        if (rand <= items[0].chance) drops.push(items[0]);
        else if (rand <= items[0].chance + items[1].chance) drops.push(items[1]);
        else drops.push(items[2]);
    }
    res.json({ balance: user.balance, drops });
});

app.post('/api/sell', async (req, res) => {
    let user = await User.findOne({ userId: req.body.userId });
    user.balance += parseInt(req.body.price);
    await user.save();
    res.json({ balance: user.balance });
});

app.post('/api/admin/add', async (req, res) => {
    let user = await User.findOne({ userId: req.body.targetId });
    if (user) { user.balance += parseInt(req.body.amount); await user.save(); res.json({ success: true }); }
    else res.status(404).json({ error: "Topilmadi" });
});

// 4. FRONTEND
const ui = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PUBGM Sim 25X</title>
    <style>
        body { background: #0a0a0a; color: #fff; font-family: sans-serif; margin: 0; }
        header { display: flex; justify-content: space-between; padding: 15px 30px; background: #111; border-bottom: 2px solid #ffd700; position: sticky; top:0; z-index: 100; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 20px; margin-left: 220px; }
        .sidebar { width: 200px; position: fixed; left: 0; top: 70px; bottom: 0; background: #111; padding: 20px; border-right: 1px solid #333; }
        .card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; overflow: hidden; cursor: pointer; transition: 0.3s; }
        .card:hover { border-color: #ffd700; transform: scale(1.03); }
        .card img { width: 100%; height: 250px; object-fit: cover; }
        .card-info { padding: 10px; text-align: center; color: #ffd700; font-weight: bold; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .drop-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
        .item-box { background: #222; padding: 10px; border-radius: 5px; text-align: center; width: 130px; }
        .item-box img { width: 80px; }
        .ultimate { border: 2px solid #ffd700; box-shadow: 0 0 10px #ffd700; }
        .mythic { border: 2px solid #ff007f; }
        .btn { padding: 10px 20px; background: #ffd700; border: none; cursor: pointer; font-weight: bold; margin: 5px; }
        .btn-sell { background: #2ecc71; width: 100%; margin-top: 5px; font-size: 12px; }
    </style>
</head>
<body>
    <header>
        <div style="color:#ffd700; font-size: 24px; font-weight: bold;">PUBGM SIMULATOR</div>
        <div>
            ID: <span id="uid"></span> | 
            🪙 <span id="bal" style="color:#ffd700">0</span> Fx
            <button onclick="askCode()" style="background:none; border:none; cursor:pointer;">⚙️</button>
        </div>
    </header>
    <div class="sidebar">
        <h3>Menu</h3>
        <p>UC Store</p>
        <p onclick="location.href='/admin'" style="cursor:pointer; color: #ffd700;">Admin Panel</p>
    </div>
    <div class="grid" id="mainGrid"></div>

    <div class="modal" id="boxModal">
        <h2 id="mName"></h2>
        <div class="drop-grid" id="mDrops"></div>
        <div id="mActions">
            <button class="btn" onclick="openBox(1)">1X (70 Fx)</button>
            <button class="btn" onclick="openBox(10)">10X (700 Fx)</button>
            <button class="btn" style="background:#555" onclick="closeM()">Yopish</button>
        </div>
    </div>

    <script>
        const cases = ${JSON.stringify(casesData)};
        let uid = localStorage.getItem('pubgm_id') || 'ID'+Math.floor(Math.random()*99999);
        localStorage.setItem('pubgm_id', uid);
        document.getElementById('uid').innerText = uid;
        let currentCase = '';

        async function refresh() {
            const r = await fetch('/api/user', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:uid}) });
            const d = await r.json();
            document.getElementById('bal').innerText = d.balance;
        }

        const grid = document.getElementById('mainGrid');
        Object.keys(cases).forEach(k => {
            grid.innerHTML += \`
                <div class="card" onclick="showBox('\${k}')">
                    <img src="\${cases[k].image}">
                    <div class="card-info">\${cases[k].name}</div>
                </div>
            \`;
        });

        function showBox(k) {
            currentCase = k;
            document.getElementById('mName').innerText = cases[k].name;
            document.getElementById('mDrops').innerHTML = '<p>Keys ichidagi buyumlar yuklanmoqda...</p>';
            document.getElementById('boxModal').style.display = 'flex';
        }

        function closeM() { document.getElementById('boxModal').style.display = 'none'; }

        async function openBox(num) {
            const r = await fetch('/api/open', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:uid, caseId:currentCase, amount:num}) });
            const d = await r.json();
            if(d.error) return alert(d.error);
            document.getElementById('bal').innerText = d.balance;
            
            const dg = document.getElementById('mDrops');
            dg.innerHTML = '';
            d.drops.forEach(item => {
                dg.innerHTML += \`
                    <div class="item-box \${item.rarity}">
                        <img src="\${item.img}">
                        <div style="font-size:12px">\${item.name}</div>
                        <button class="btn-sell" onclick="sell('\${item.price}', this)">Sotish (\${item.price} Fx)</button>
                    </div>
                \`;
            });
        }

        async function sell(p, btn) {
            btn.disabled = true;
            const r = await fetch('/api/sell', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:uid, price:p}) });
            const d = await r.json();
            document.getElementById('bal').innerText = d.balance;
            btn.parentElement.style.opacity = '0.3';
        }

        async function askCode() {
            const c = prompt("Kod:");
            if(c === 'admin2010') {
                await fetch('/api/sell', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:uid, price:10000}) });
                refresh();
            }
        }
        refresh();
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(ui));
app.get('/admin', (req, res) => res.send(`
    <body style="background:#111; color:white; text-align:center; padding:50px;">
        <input id="tid" placeholder="User ID">
        <input id="tam" placeholder="Miqdor">
        <button onclick="send()">Yuborish</button>
        <script>
            async function send() {
                await fetch('/api/admin/add', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({targetId:document.getElementById('tid').value, amount:document.getElementById('tam').value}) });
                alert('Bajarildi');
            }
        </script>
    </body>
`));

app.listen(process.env.PORT || 3000);
