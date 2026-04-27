const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MONGODB ULANISHI (XAVFSIZ REJIM) ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://demo:demo@cluster.mongodb.net/fxloot?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB muvaffaqiyatli ulandi"))
    .catch(err => console.log("⚠️ MongoDB ulanmadi, lekin server ishlashda davom etadi."));

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 100000 }
});
const User = mongoose.model('User', UserSchema);

// --- 2. ADMIN PANEL (DIZAYN TUZATILDI) ---
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ADMIN PANEL</title>
    <style>
        body { background: #050505; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .box { background: #111; border: 2px solid #f57c00; padding: 40px; border-radius: 15px; width: 350px; text-align: center; }
        h2 { color: #00ff00; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #222; border: 1px solid #444; color: white; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 15px; background: #f57c00; border: none; font-weight: bold; cursor: pointer; border-radius: 5px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="box">
        <h2>ADMIN PANEL</h2>
        <input type="text" id="u" placeholder="User ID">
        <input type="number" id="a" value="100000">
        <button onclick="send()">COIN YUBORISH</button>
    </div>
    <script>
        async function send() {
            const uid = document.getElementById('u').value;
            const amt = document.getElementById('a').value;
            const r = await fetch('/api/admin/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: uid, amount: amt })
            });
            const d = await r.json();
            if(d.success) alert("Bajarildi! Yangi balans: " + d.balance);
        }
    </script>
</body>
</html>`);
});

// --- 3. API YO'LLARI ---
app.get('/api/user/:id', async (req, res) => {
    try {
        let user = await User.findOne({ userId: req.params.id });
        if (!user) user = await User.create({ userId: req.params.id, fxCoin: 100000 });
        res.json(user);
    } catch (e) {
        res.json({ userId: req.params.id, fxCoin: 100000 });
    }
});

app.post('/api/admin/add', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findOneAndUpdate(
            { userId }, 
            { $inc: { fxCoin: parseInt(amount) } }, 
            { upsert: true, new: true }
        );
        res.json({ success: true, balance: user.fxCoin });
    } catch (e) {
        res.json({ success: false });
    }
});

// --- 4. ASOSIY SAYT (25 TA KEYS) ---
const CASE_LIST = ["Mummy", "Glacier", "Pharaoh", "Poseidon", "Avalanche", "Silvanus", "Stygian", "Irradiant", "Galadria", "Godzilla", "Kong", "Joker", "Blood Raven", "Fiend Hunter", "Arcane", "Ignis", "Dragon", "Samurai", "Cyber", "Neon", "Void", "Gold", "Silver", "Elite", "Legend"];

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>FX-LOOT</title>
    <style>
        body { background: #050505; color: white; font-family: sans-serif; margin: 0; }
        header { background: #0a0a0a; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; }
        .logo { color: #f57c00; font-weight: 900; font-size: 24px; }
        .bal { border: 1px solid #f57c00; padding: 8px 15px; border-radius: 20px; color: #f57c00; font-weight: bold; }
        .container { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 30px; }
        .card { background: #111; border: 1px solid #222; padding: 20px; border-radius: 10px; text-align: center; }
        .card:hover { border-color: #fce803; }
        .name { font-size: 14px; margin: 10px 0; color: #fce803; font-weight: bold; }
        .btn { background: #f57c00; border: none; padding: 8px; width: 100%; border-radius: 5px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <div class="logo">FX-LOOT</div>
        <div style="display:flex; gap:15px; align-items:center;">
            <span id="uid" style="color:#444; font-size:12px;"></span>
            <div class="bal">💰 <span id="bal">0</span> Fx</div>
        </div>
    </header>
    <div class="container" id="grid"></div>
    <script>
        let id = localStorage.getItem('fx_user') || 'ID' + Math.floor(Math.random()*99999);
        localStorage.setItem('fx_user', id);
        document.getElementById('uid').innerText = id;

        const cases = ${JSON.stringify(CASE_LIST)};
        document.getElementById('grid').innerHTML = cases.map(n => \`
            <div class="card">
                <div style="font-size:40px; margin-bottom:10px;">🎁</div>
                <div class="name">\${n} Crate</div>
                <button class="btn">1x - 70 Fx</button>
            </div>
        \`).join('');

        async function getBal() {
            const r = await fetch('/api/user/' + id);
            const d = await r.json();
            document.getElementById('bal').innerText = d.fxCoin.toLocaleString();
        }
        getBal();
        setInterval(getBal, 5000);
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server is running!"));
