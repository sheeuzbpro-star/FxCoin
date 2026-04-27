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
// FxCoin yuborish
app.post('/api/admin/add-coin', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
    res.json({ success: true, balance: user.fxCoin });
});

// Kodni tekshirish (UC xaridini ko'rish)
app.post('/api/admin/check-code', async (req, res) => {
    const { code } = req.body;
    const order = await Order.findOne({ code });
    if (order) {
        res.json({ success: true, order });
    } else {
        res.json({ success: false, message: "Kod topilmadi!" });
    }
});

// 4. ADMIN PANEL (FRONTEND)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT Admin Control</title>
    <style>
        body { background: #0f1015; color: white; font-family: 'Segoe UI', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .container { width: 90%; max-width: 800px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: #1a1c24; padding: 25px; border-radius: 15px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        h2 { color: #f57c00; font-size: 18px; text-transform: uppercase; margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #0d0e14; border: 1px solid #444; color: white; border-radius: 8px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; margin-top: 10px; }
        .btn-coin { background: #f57c00; color: white; }
        .btn-uc { background: #2196f3; color: white; }
        button:hover { opacity: 0.8; transform: translateY(-2px); }
        .result { margin-top: 15px; padding: 10px; background: #000; border-radius: 5px; font-size: 13px; color: #4caf50; min-height: 40px; }
        @media (max-width: 600px) { .container { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <h1 style="color: #f57c00;">🛡️ FX-LOOT ADMIN PANEL</h1>
    <div class="container">
        
        <div class="card">
            <h2>💰 FxCoin Yuborish</h2>
            <input type="text" id="coinUser" placeholder="Foydalanuvchi ID">
            <input type="number" id="coinAmt" placeholder="Miqdor (Fx)">
            <button class="btn-coin" onclick="sendCoin()">TANGANI YUBORISH</button>
            <div id="coinRes" class="result">Tayyor.</div>
        </div>

        <div class="card">
            <h2>🔑 UC Kodni Tekshirish</h2>
            <input type="text" id="ucCode" placeholder="Kodni kiriting (Masalan: FX-ABCD)">
            <button class="btn-uc" onclick="checkCode()">KODNI KO'RISH</button>
            <div id="ucRes" class="result">Ma'lumot yo'q.</div>
        </div>

    </div>

    <script>
        async function sendCoin() {
            const userId = document.getElementById('coinUser').value;
            const amount = document.getElementById('coinAmt').value;
            if(!userId || !amount) return alert("To'ldiring!");

            const res = await fetch('/api/admin/add-coin', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId, amount })
            });
            const data = await res.json();
            document.getElementById('coinRes').innerHTML = "✅ " + userId + " yangi balansi: " + data.balance + " Fx";
        }

        async function checkCode() {
            const code = document.getElementById('ucCode').value;
            if(!code) return alert("Kod yozing!");

            const res = await fetch('/api/admin/check-code', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            const resDiv = document.getElementById('ucRes');
            if(data.success) {
                resDiv.style.color = "#4caf50";
                resDiv.innerHTML = "👤 User: " + data.order.userId + "<br>💎 UC: " + data.order.ucAmount + " UC<br>🕒 Holat: " + data.order.status;
            } else {
                resDiv.style.color = "#ff5252";
                resDiv.innerText = data.message;
            }
        }
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server yondi!"));
