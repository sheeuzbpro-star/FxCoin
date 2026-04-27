const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MONGODB ---
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://demo:demo@cluster.mongodb.net/fxloot?retryWrites=true&w=majority")
    .then(() => console.log("✅ Baza ulandi"))
    .catch(err => console.log("⚠️ Baza ulanmadi, lekin sayt ishlaydi."));

const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 0 }
}));

// --- 2. ADMIN PANEL (Rasmda ko'rsatilgan dizayn) ---
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>ADMIN PANEL</title>
    <style>
        body { background-color: #050505; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
        .admin-box { 
            background-color: #121212; 
            border: 2px solid #f57c00; 
            border-radius: 15px; 
            padding: 50px 40px; 
            width: 400px; 
            text-align: center;
            box-shadow: 0 0 20px rgba(245, 124, 0, 0.2);
        }
        h2 { color: #00ff00; margin-top: 0; margin-bottom: 40px; font-weight: bold; letter-spacing: 2px; font-size: 28px; }
        input { 
            width: 100%; 
            padding: 15px; 
            margin-bottom: 25px; 
            background-color: #1e1e1e; 
            border: 1px solid #333; 
            color: white; 
            border-radius: 8px; 
            box-sizing: border-box; 
            font-size: 16px; 
            outline: none; 
        }
        input:focus { border-color: #f57c00; }
        button { 
            width: 100%; 
            padding: 18px; 
            background-color: #f57c00; 
            color: black; 
            border: none; 
            border-radius: 8px; 
            font-weight: bold; 
            cursor: pointer; 
            font-size: 16px; 
            text-transform: uppercase;
        }
        button:hover { background-color: #ff9800; }
    </style>
</head>
<body>
    <div class="admin-box">
        <h2>ADMIN PANEL</h2>
        <input type="text" id="uid" placeholder="Foydalanuvchi ID">
        <input type="number" id="amt" placeholder="-1">
        <button onclick="sendCoin()">COIN YUBORISH</button>
    </div>
    <script>
        async function sendCoin() {
            const id = document.getElementById('uid').value;
            const amt = document.getElementById('amt').value;
            if(!id || !amt) return alert("Ma'lumotlarni to'ldiring!");
            
            const res = await fetch('/api/admin/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: id, amount: amt })
            });
            const data = await res.json();
            if(data.success) {
                alert("Muvaffaqiyatli! Balans: " + data.balance);
            }
        }
    </script>
</body>
</html>`);
});

// --- 3. API YO'LLARI ---
app.get('/api/user/:id', async (req, res) => {
    try {
        let user = await User.findOne({ userId: req.params.id });
        if (!user) user = await User.create({ userId: req.params.id, fxCoin: 0 });
        res.json(user);
    } catch(e) { res.json({userId: req.params.id, fxCoin: 0}); }
});

app.post('/api/user/update', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount } }, { new: true });
        res.json(user);
    } catch(e) { res.json({success: false}); }
});

app.post('/api/admin/add', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: parseInt(amount) } }, { upsert: true, new: true });
        res.json({ success: true, balance: user.fxCoin });
    } catch(e) { res.json({success: false}); }
});

// --- 4. ASOSIY SAYT ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT</title>
    <style>
        body { background-color: #050505; color: white; font-family: sans-serif; margin: 0; }
        header { background-color: #0a0a0a; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a1a; }
        .logo { color: #f57c00; font-weight: 900; font-size: 20px; }
        .balance-box { background: #000; border: 1px solid #f57c00; border-radius: 20px; padding: 5px 15px; color: #f57c00; font-weight: bold; display: flex; align-items: center; gap: 5px; }
        
        .main-container { display: flex; padding: 20px; gap: 20px; }
        .sidebar { width: 250px; background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 10px; }
        .content { flex: 1; display: flex; flex-wrap: wrap; gap: 15px; }

        .case-card { background: #111; border: 1px solid #222; border-radius: 10px; width: 200px; padding: 15px; text-align: center; }
        .case-img { width: 140px; height: 140px; background: #1a1a1a; border-radius: 5px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .case-img img { width: 100%; height: 100%; object-fit: cover; }
        .case-name { font-weight: bold; color: #fce803; margin-bottom: 10px; text-transform: uppercase; font-size: 14px; }
        .btn-open { background: #f57c00; color: black; border: none; padding: 8px; width: 100%; border-radius: 5px; font-weight: bold; cursor: pointer; margin-bottom: 5px; }
        .btn-multi { background: #222; color: white; border: none; padding: 8px; width: 100%; border-radius: 5px; cursor: pointer; font-size: 12px; }
    </style>
</head>
<body>
    <header>
        <div class="logo">FX-LOOT</div>
        <div style="display:flex; align-items:center; gap:10px;">
            <span id="u_id" style="color:#555; font-size:12px;">USER_...</span>
            <div class="balance-box">💰 <span id="u_bal">0</span> Fx</div>
        </div>
    </header>

    <div class="main-container">
        <div class="sidebar">
            <h4 style="color:#f57c00; margin-top:0;">💎 UC XARID QILISH</h4>
            <select style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; margin-bottom:10px;">
                <option>60 UC - 3000 Fx</option>
            </select>
            <input type="text" placeholder="Promokod" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:white; margin-bottom:10px; box-sizing:border-box;">
            <button class="btn-open">AYLANTIRISH</button>
        </div>
        <div class="content" id="cases"></div>
    </div>

    <script>
        let userId = localStorage.getItem('fx_user') || 'USER_' + Math.floor(Math.random() * 9000 + 1000);
        localStorage.setItem('fx_user', userId);
        document.getElementById('u_id').innerText = userId;

        const DATA = [
            { id: 'mummy', name: 'Mummy Case', img: 'https://piskel-imgstore-b.appspot.com/img/8c9e5e74-7299-11ee-895d-978e877e8955.gif' },
            { id: 'glacier', name: 'Glacier Case', img: 'https://i.ibb.co/tB7P0WJ/fiend.png' },
            { id: 'xsuit', name: 'X-Suit Case', img: 'https://i.ibb.co/XSBG6Y0/pharaoh.png' }
        ];

        function render() {
            let h = '';
            DATA.forEach(c => {
                h += \`
                <div class="case-card">
                    <div class="case-img"><img src="\${c.img}"></div>
                    <div class="case-name">\${c.name}</div>
                    <button class="btn-open">1x - 70 Fx</button>
                    <button class="btn-multi">10x - 700 Fx</button>
                </div>\`;
            });
            document.getElementById('cases').innerHTML = h;
        }

        async function loadBal() {
            const r = await fetch('/api/user/' + userId);
            const d = await r.json();
            document.getElementById('u_bal').innerText = d.fxCoin;
        }

        render();
        loadBal();
        setInterval(loadBal, 5000);
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server ishladi!"));
