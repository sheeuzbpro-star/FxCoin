const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MONGODB ---
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://demo:demo@cluster.mongodb.net/fxloot?retryWrites=true&w=majority")
    .then(() => console.log("✅ Baza ulandi"))
    .catch(err => console.log("⚠️ Baza ulanmadi."));

const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 100000 } // Yangi foydalanuvchilarga 100,000 Fx beriladi
}));

// --- 2. KEYS DATA (25 TA KEYS) ---
const CASE_NAMES = [
    "Mummy", "Glacier", "Pharaoh", "Poseidon", "Avalanche", "Silvanus", "Stygian", 
    "Irradiant", "Galadria", "Godzilla", "Kong", "Joker", "Blood Raven", "Fiend Hunter", 
    "Arcane", "Ignis", "Dragon", "Samurai", "Cyber", "Neon", "Void", "Gold", "Silver", "Elite", "Legend"
];

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
        .admin-box { background-color: #121212; border: 2px solid #f57c00; border-radius: 15px; padding: 40px; width: 380px; text-align: center; box-shadow: 0 0 20px rgba(245, 124, 0, 0.2); }
        h2 { color: #00ff00; margin-bottom: 30px; letter-spacing: 2px; }
        input { width: 100%; padding: 15px; margin-bottom: 20px; background-color: #1e1e1e; border: 1px solid #333; color: white; border-radius: 8px; box-sizing: border-box; }
        button { width: 100%; padding: 18px; background-color: #f57c00; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
        button:hover { background-color: #ff9800; }
    </style>
</head>
<body>
    <div class="admin-box">
        <h2>ADMIN PANEL</h2>
        <input type="text" id="uid" placeholder="Foydalanuvchi ID">
        <input type="number" id="amt" value="100000">
        <button onclick="sendCoin()">COIN YUBORISH</button>
    </div>
    <script>
        async function sendCoin() {
            const id = document.getElementById('uid').value;
            const amt = document.getElementById('amt').value;
            if(!id) return alert("Foydalanuvchi ID sini kiriting!");
            const res = await fetch('/api/admin/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: id, amount: amt })
            });
            const data = await res.json();
            if(data.success) alert("Muvaffaqiyatli! Balans: " + data.balance);
        }
    </script>
</body>
</html>`);
});

// --- 4. API YO'LLARI ---
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 100000 });
    res.json(user);
});

app.post('/api/admin/add', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
    res.json({ success: true, balance: user.fxCoin });
});

// --- 5. ASOSIY SAYT ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT</title>
    <style>
        body { background-color: #050505; color: white; font-family: sans-serif; margin: 0; }
        header { background: #0a0a0a; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a1a; position: sticky; top: 0; z-index: 100; }
        .logo { color: #f57c00; font-weight: 900; font-size: 24px; text-decoration: none; }
        .balance-box { background: #000; border: 1px solid #f57c00; border-radius: 20px; padding: 8px 18px; color: #f57c00; font-weight: bold; }
        
        .main-layout { display: flex; padding: 20px; }
        .sidebar { width: 280px; background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 12px; height: fit-content; }
        .content { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding-left: 20px; }

        .case-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px; text-align: center; transition: 0.3s; }
        .case-card:hover { border-color: #fce803; transform: translateY(-5px); }
        .case-name { font-weight: bold; color: #fce803; margin: 15px 0; text-transform: uppercase; font-size: 14px; }
        .btn-1x { background: #f57c00; color: black; border: none; padding: 10px; width: 100%; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 8px; }
        .btn-10x { background: #2a2a2a; color: white; border: none; padding: 10px; width: 100%; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <a href="/" class="logo">FX-LOOT</a>
        <div style="display:flex; align-items:center; gap:15px;">
            <span id="u_id" style="color:#555; font-size:13px;">ID: ...</span>
            <div class="balance-box">💰 <span id="u_bal">0</span> Fx</div>
        </div>
    </header>

    <div class="main-layout">
        <div class="sidebar">
            <h3 style="color:#f57c00; margin-top:0;">💎 UC XARID QILISH</h3>
            <select style="width:100%; padding:12px; background:#111; color:white; border:1px solid #333; margin-bottom:15px;">
                <option>60 UC - 3000 Fx</option>
                <option>325 UC - 15000 Fx</option>
            </select>
            <button class="btn-1x">AYLANTIRISH</button>
        </div>
        <div class="content" id="cases_grid"></div>
    </div>

    <script>
        let userId = localStorage.getItem('fx_user') || 'USER' + Math.floor(Math.random() * 99999);
        localStorage.setItem('fx_user', userId);
        document.getElementById('u_id').innerText = userId;

        const cases = ${JSON.stringify(CASE_NAMES)};

        function draw() {
            document.getElementById('cases_grid').innerHTML = cases.map(name => \`
                <div class="case-card">
                    <div style="height:120px; background:#1a1a1a; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#333; font-size:40px;">🎁</div>
                    <div class="case-name">\${name} Crate</div>
                    <button class="btn-1x">1x - 70 Fx</button>
                    <button class="btn-10x">10x - 700 Fx</button>
                </div>
            \`).join('');
        }

        async function updateBal() {
            const r = await fetch('/api/user/' + userId);
            const d = await r.json();
            document.getElementById('u_bal').innerText = d.fxCoin.toLocaleString();
        }

        draw();
        updateBal();
        setInterval(updateBal, 3000);
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
