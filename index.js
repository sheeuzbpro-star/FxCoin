const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. MONGODB ULANISHI
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Baza bog'landi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

// 2. MODELLAR
const User = mongoose.model('User', new mongoose.Schema({
    userId: String,
    fxCoin: { type: Number, default: 0 }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    code: String,
    userId: String,
    ucAmount: Number,
    status: { type: String, default: 'pending' }
}));

// 3. API YO'LLARI
app.post('/api/admin/add-coin', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
    res.json({ success: true, balance: user.fxCoin });
});

app.post('/api/admin/check-code', async (req, res) => {
    const { code } = req.body;
    const order = await Order.findOne({ code });
    if (order) {
        res.json({ success: true, order });
    } else {
        res.json({ success: false, message: "Kod topilmadi!" });
    }
});

// 4. ASOSIY SAHIFA (ODDIY FOYDALANUVCHILAR UCHUN)
app.get('/', (req, res) => {
    res.send("<h1>FX-LOOT API is running...</h1><p>Admin panelga kirish taqiqlangan.</p>");
});

// 5. ADMIN PANEL (MAXFIY LOGIN BILAN)
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-ADMIN LOGIN</title>
    <style>
        body { background: #0a0b10; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .login-box { background: #15171f; padding: 30px; border-radius: 15px; border: 1px solid #333; text-align: center; width: 300px; }
        .admin-content { display: none; width: 800px; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; }
        .card { background: #1a1c24; padding: 20px; border-radius: 12px; border: 1px solid #444; }
        h2 { color: #f57c00; font-size: 16px; margin-top: 0; }
        input { width: 100%; padding: 10px; margin: 10px 0; background: #0d0e14; border: 1px solid #444; color: white; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; background: #f57c00; color: white; }
        .result { margin-top: 10px; font-size: 12px; color: #4caf50; min-height: 20px; }
    </style>
</head>
<body>

    <div id="loginArea" class="login-box">
        <h2 style="color: #f57c00;">ADMIN KIRISH</h2>
        <input type="text" id="admUser" placeholder="Login">
        <input type="password" id="admPass" placeholder="Parol">
        <button onclick="checkAdmin()">KIRISH</button>
        <p id="error" style="color: red; font-size: 12px; display: none;">Xato!</p>
    </div>

    <div id="panelArea" class="admin-content">
        <div class="card">
            <h2>💰 FxCoin Yuborish</h2>
            <input type="text" id="coinUser" placeholder="User ID">
            <input type="number" id="coinAmt" placeholder="Miqdor">
            <button onclick="sendCoin()">YUBORISH</button>
            <div id="coinRes" class="result"></div>
        </div>
        <div class="card">
            <h2>🔑 UC Kod Tekshirish</h2>
            <input type="text" id="ucCode" placeholder="Kod">
            <button style="background: #2196f3;" onclick="checkCode()">TEKSHIRISH</button>
            <div id="ucRes" class="result"></div>
        </div>
    </div>

    <script>
        function checkAdmin() {
            const u = document.getElementById('admUser').value;
            const p = document.getElementById('admPass').value;
            
            // ADMIN PAROLNI SHU YERDA O'ZGARTIRISHINGIZ MUMKIN
            if(u === 'admin' && p === '2010') {
                document.getElementById('loginArea').style.display = 'none';
                document.getElementById('panelArea').style.display = 'grid';
            } else {
                document.getElementById('error').style.display = 'block';
            }
        }

        async function sendCoin() {
            const userId = document.getElementById('coinUser').value;
            const amount = document.getElementById('coinAmt').value;
            const res = await fetch('/api/admin/add-coin', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId, amount })
            });
            const data = await res.json();
            document.getElementById('coinRes').innerText = "✅ Balans: " + data.balance;
        }

        async function checkCode() {
            const code = document.getElementById('ucCode').value;
            const res = await fetch('/api/admin/check-code', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            const div = document.getElementById('ucRes');
            if(data.success) {
                div.innerHTML = "👤 ID: " + data.order.userId + " | 💎 UC: " + data.order.ucAmount;
            } else {
                div.innerText = "❌ Kod topilmadi";
            }
        }
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server ready on port " + PORT));
