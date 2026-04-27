const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MONGODB ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://demo:demo@cluster.mongodb.net/fxloot?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Baza ulandi"))
    .catch(err => console.log("⚠️ Baza ulanmadi, lekin server ishlaydi."));

const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 1000000 } // 1,000,000 FxCoin boshlang'ich balans
}));

// --- 2. ADMIN PANEL (Rasmdagi dizayn) ---
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ADMIN PANEL</title>
    <style>
        body { background: #050505; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .admin-box { background: #121212; border: 2px solid #f57c00; border-radius: 15px; padding: 40px; width: 380px; text-align: center; box-shadow: 0 0 20px rgba(245, 124, 0, 0.3); }
        h2 { color: #00ff00; margin-bottom: 30px; letter-spacing: 1px; }
        input { width: 100%; padding: 15px; margin-bottom: 20px; background: #1e1e1e; border: 1px solid #333; color: white; border-radius: 8px; box-sizing: border-box; outline: none; }
        input:focus { border-color: #f57c00; }
        button { width: 100%; padding: 18px; background: #f57c00; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
        button:hover { background: #ff9800; }
    </style>
</head>
<body>
    <div class="admin-box">
        <h2>ADMIN PANEL</h2>
        <input type="text" id="uid" placeholder="Foydalanuvchi ID">
        <input type="number" id="amt" value="1000000">
        <button onclick="send()">COIN YUBORISH</button>
    </div>
    <script>
        async function send() {
            const id = document.getElementById('uid').value;
            const amt = document.getElementById('amt').value;
            if(!id) return alert("ID kiriting!");
            const res = await fetch('/api/admin/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: id, amount: amt })
            });
            const data = await res.json();
            if(data.success) alert("Muvaffaqiyatli yuborildi! Jami: " + data.balance);
        }
    </script>
</body>
</html>`);
});

// --- 3. API YO'LLARI ---
app.get('/api/user/:id', async (req, res) => {
    try {
        let user = await User.findOne({ userId: req.params.id });
        if (!user) user = await User.create({ userId: req.params.id, fxCoin: 1000000 });
        res.json(user);
    } catch(e) { res.json({ userId: req.params.id, fxCoin: 1000000 }); }
});

app.post('/api/admin/add', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
        res.json({ success: true, balance: user.fxCoin });
    } catch(e) { res.json({ success: false }); }
});

// --- 4. ASOSIY SAYT (25 TA KEYS) ---
const CASES = ["Mummy", "Glacier", "Pharaoh", "Poseidon", "Avalanche", "Silvanus", "Stygian", "Irradiant", "Galadria", "Godzilla", "Kong", "Joker", "Blood Raven", "Fiend Hunter", "Arcane", "Ignis", "Dragon", "Samurai", "Cyber", "Neon", "Void", "Gold", "Silver", "Elite", "Legend"];

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT | 1M COINS</title>
    <style>
        body { background: #050505; color: white; font-family: sans-serif; margin: 0; }
        header { background: #0a0a0a; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; position: sticky; top:0; z-index:10; }
        .logo { color: #f57c00; font-weight: 900; font-size: 24px; }
        .bal-box { border: 1px solid #f57c00; padding: 8px 20px; border-radius: 25px; color: #f57c00; font-weight: bold; background: rgba(245,124,0,0.05); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px; text-align: center; transition: 0.3s; }
        .card:hover { border-color: #fce803; transform: scale(1.03); }
        .case-icon { font-size: 50px; margin-bottom: 15px; display: block; }
        .case-name { color: #fce803; font-weight: bold; text-transform: uppercase; font-size: 14px; margin-bottom: 15px; }
        .btn-open { background: #f57c00; color: black; border: none; padding: 10px; width: 100%; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 8px; }
        .btn-10x { background: #222; color: #aaa; border: none; padding: 10px; width: 100%; border-radius: 6px; cursor: pointer; font-size: 12px; }
    </style>
</head>
<body>
    <header>
        <div class="logo">FX-LOOT</div>
        <div style="display:flex; align-items:center; gap:15px;">
            <span id="uid" style="color:#555; font-size:12px;"></span>
            <div class="bal-box">💰 <span id="bal">0</span> Fx</div>
        </div>
    </header>
    <div class="grid" id="main_grid"></div>
    <script>
        let id = localStorage.getItem('fx_user') || 'ID' + Math.floor(Math.random()*999999);
        localStorage.setItem('fx_user', id);
        document.getElementById('uid').innerText = id;

        const list = ${JSON.stringify(CASES)};
        document.getElementById('main_grid').innerHTML = list.map(name => \`
            <div class="card">
                <span class="case-icon">🎁</span>
                <div class="case-name">\${name} Crate</div>
                <button class="btn-open">1x - 70 Fx</button>
                <button class="btn-10x">10x - 700 Fx</button>
            </div>
        \`).join('');

        async function refresh() {
            const r = await fetch('/api/user/' + id);
            const d = await r.json();
            document.getElementById('bal').innerText = d.fxCoin.toLocaleString();
        }
        refresh();
        setInterval(refresh, 4000);
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server is running on port " + PORT));
