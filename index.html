const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. MONGODB ULANISHI
const MONGO_URI = process.env.MONGO_URI || "Sizning_MongoDB_Havolangiz";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Baza bilan aloqa o'rnatildi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

// 2. MA'LUMOTLAR MODELI
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 0 },
    history: [String]
}));

// 3. API YO'LLARI (BACKEND)
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 0 });
    res.json(user);
});

app.post('/api/admin/add', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate(
        { userId }, 
        { $inc: { fxCoin: parseInt(amount) }, $push: { history: `+${amount} Fx (${new Date().toLocaleString()})` } },
        { upsert: true, new: true }
    );
    res.json(user);
});

// 4. FRONTEND (HTML + CSS + JS bitta qatorda)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT Professional Terminal</title>
    <style>
        body { background: #0a0b10; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #15171f; padding: 30px; border-radius: 15px; border: 1px solid #2d3245; width: 400px; text-align: center; }
        h1 { color: #f57c00; letter-spacing: 2px; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #0d0e14; border: 1px solid #2d3245; color: white; border-radius: 8px; box-sizing: border-box; }
        button { width: 100%; padding: 15px; background: #f57c00; border: none; color: white; font-weight: bold; border-radius: 8px; cursor: pointer; transition: 0.3s; }
        button:hover { background: #e65100; box-shadow: 0 0 15px rgba(245, 124, 0, 0.4); }
        .stats { margin-top: 20px; padding: 10px; background: #0d0e14; border-radius: 8px; font-size: 14px; color: #90a4ae; }
    </style>
</head>
<body>
    <div class="card">
        <h1>FX-ADMIN</h1>
        <input type="text" id="uId" placeholder="Foydalanuvchi ID">
        <input type="number" id="amt" placeholder="FxCoin Miqdori">
        <button onclick="send()">TANGALARI YUBORISH</button>
        <div class="stats" id="status">Tizim tayyor.</div>
    </div>

    <script>
        async function send() {
            const userId = document.getElementById('uId').value;
            const amount = document.getElementById('amt').value;
            const status = document.getElementById('status');

            if(!userId || !amount) return alert("To'ldiring!");

            status.innerText = "Yuborilmoqda...";
            try {
                const res = await fetch('/api/admin/add', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ userId, amount })
                });
                const data = await res.json();
                status.innerHTML = "✅ " + userId + " balansi: <b>" + data.fxCoin + " Fx</b>";
            } catch (err) {
                status.innerText = "❌ Xatolik yuz berdi!";
            }
        }
    </script>
</body>
</html>
    `);
});

// 5. SERVERNI YOQISH
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server yondi: port " + PORT));