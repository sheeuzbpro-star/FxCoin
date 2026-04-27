const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// 2. MODELLAR
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 500 }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    code: { type: String, required: true },
    userId: { type: String, required: true },
    ucAmount: { type: Number, required: true },
    status: { type: String, default: 'Kutilmoqda' },
    date: { type: Date, default: Date.now }
}));

// 3. API YO'LLARI
app.get('/api/user/:id', async (req, res) => {
    try {
        let user = await User.findOne({ userId: req.params.id });
        if (!user) user = await User.create({ userId: req.params.id, fxCoin: 500 });
        res.json(user);
    } catch (e) { res.status(500).json(e); }
});

// COIN YUBORISH API (ADMIN)
app.post('/api/admin/add-coin', async (req, res) => {
    const { userId, amount } = req.body;
    try {
        const user = await User.findOneAndUpdate(
            { userId: userId }, 
            { $inc: { fxCoin: parseInt(amount) } }, 
            { upsert: true, new: true }
        );
        res.json({ success: true, balance: user.fxCoin });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// UC BUYURTMALARINI OLISH (ADMIN)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json(e); }
});

// UC ALMASHTIRISH (USER)
app.post('/api/user/exchange', async (req, res) => {
    let { userId, amount, uc, promo } = req.body;
    if (promo === "rudi") amount = Math.max(0, amount - 500);
    
    try {
        const user = await User.findOne({ userId });
        if (!user || user.fxCoin < amount) return res.status(400).json({ message: "Coins not enough" });
        
        const code = "FX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: -amount } });
        
        const newOrder = new Order({ code, userId, ucAmount: uc });
        await newOrder.save();
        
        res.json({ success: true, code });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. ADMIN PANEL (TERMINAL STYLE)
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>FX-TERMINAL</title>
    <style>
        body { background: #050608; color: #00ff00; font-family: 'Courier New', monospace; margin: 0; display: flex; height: 100vh; }
        .sidebar { width: 260px; background: #0a0b10; border-right: 1px solid #1a1c24; padding: 20px; box-sizing: border-box; }
        .main { flex: 1; padding: 30px; overflow-y: auto; background: #050608; }
        .btn { display: block; width: 100%; padding: 12px; background: #111; color: #00ff00; border: 1px solid #333; cursor: pointer; margin-bottom: 10px; text-align: left; font-family: inherit; }
        .btn:hover { background: #00ff00; color: black; }
        .card { background: #0d0e14; border: 1px solid #00ff00; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        input { background: #000; border: 1px solid #00ff00; color: #00ff00; padding: 12px; width: 100%; margin-bottom: 10px; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; color: #00ff00; }
        th, td { border: 1px solid #1a1c24; padding: 10px; text-align: left; font-size: 13px; }
        h2 { border-bottom: 1px solid #00ff00; padding-bottom: 10px; font-size: 18px; }
    </style>
</head>
<body>
    <div id="auth" style="position:fixed; top:0; left:0; width:100%; height:100%; background:#050608; z-index:1000; display:flex; justify-content:center; align-items:center;">
        <div class="card" style="width:300px; text-align:center;">
            <h2>ADMIN AUTH</h2>
            <input type="password" id="pass" placeholder="Password">
            <button class="btn" style="text-align:center" onclick="login()">ENTER</button>
        </div>
    </div>

    <div class="sidebar">
        <h3>TERMINAL v3.0</h3>
        <button class="btn" onclick="show('coin')">>> COIN TUSHURISH</button>
        <button class="btn" onclick="show('uc')">>> UC XARIDLAR</button>
        <button class="btn" onclick="location.reload()">>> REFRESH</button>
    </div>
    <div class="main">
        <div id="p-coin" class="section">
            <h2>💰 FXCOIN TUSHURISH XIZMATI</h2>
            <div class="card">
                <input type="text" id="targetId" placeholder="Foydalanuvchi ID (masalan: USER_1234)">
                <input type="number" id="targetAmt" placeholder="Coin Miqdori">
                <button class="btn" style="background:#00ff00; color:black;" onclick="sendCoins()">YUBORISH (EXECUTE)</button>
                <p id="status"></p>
            </div>
        </div>

        <div id="p-uc" class="section" style="display:none">
            <h2>💎 UC XARID QILGANLAR (LOGS)</h2>
            <div class="card">
                <table id="ucTable">
                    <thead><tr><th>DATE</th><th>USER ID</th><th>CODE</th><th>UC</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        function login() {
            if(document.getElementById('pass').value === '2010') document.getElementById('auth').style.display='none';
            else alert("Xato!");
        }

        function show(p) {
            document.getElementById('p-coin').style.display = p === 'coin' ? 'block' : 'none';
            document.getElementById('p-uc').style.display = p === 'uc' ? 'block' : 'none';
            if(p === 'uc') loadUC();
        }

        async function sendCoins() {
            const uid = document.getElementById('targetId').value;
            const amt = document.getElementById('targetAmt').value;
            if(!uid || !amt) return alert("To'ldiring!");
            
            const res = await fetch('/api/admin/add-coin', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ userId: uid, amount: amt })
            });
            const data = await res.json();
            if(data.success) {
                document.getElementById('status').innerText = "✅ Bajarildi! Yangi balans: " + data.balance;
                document.getElementById('targetAmt').value = '';
            } else {
                alert("Xato: " + data.error);
            }
        }

        async function loadUC() {
            const res = await fetch('/api/admin/orders');
            const data = await res.json();
            const body = document.querySelector('#ucTable tbody');
            body.innerHTML = data.map(o => \`
                <tr>
                    <td>\${new Date(o.date).toLocaleDateString()}</td>
                    <td>\${o.userId}</td>
                    <td style="color:#ffcc00; font-weight:bold;">\${o.code}</td>
                    <td>\${o.ucAmount} UC</td>
                </tr>
            \`).join('');
        }
    </script>
</body>
</html>`);
});

// 5. USER FRONTEND (Qolgan barcha qismlar bir xil...)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head>... (Frontend kodi yuqoridagidek) ...</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 TERMINAL ACTIVE ON " + PORT));
