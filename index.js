const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Baza ulandi"))
    .catch(err => console.error("❌ Baza xatosi:", err));

// 2. MODELLAR
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    fxCoin: { type: Number, default: 500 }
}));

// 3. API YO'LLARI
app.get('/api/user/:id', async (req, res) => {
    let user = await User.findOne({ userId: req.params.id });
    if (!user) user = await User.create({ userId: req.params.id, fxCoin: 500 });
    res.json(user);
});

app.post('/api/user/update-balance', async (req, res) => {
    const { userId, amount } = req.body;
    const user = await User.findOneAndUpdate({ userId }, { $inc: { fxCoin: amount } }, { new: true });
    res.json(user);
});

// 4. FRONTEND
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>FX-LOOT | PREMIUM</title>
    <style>
        body { background: #050608; color: white; font-family: 'Segoe UI', sans-serif; margin: 0; overflow: hidden; }
        header { background: #0a0b10; padding: 10px 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a1c24; }
        
        .nav-right { display: flex; align-items: center; gap: 15px; }
        .balance-box { background: #15171f; border: 1px solid #f57c00; padding: 5px 15px; border-radius: 20px; color: #f57c00; font-weight: bold; }
        .settings-btn { cursor: pointer; font-size: 20px; transition: 0.3s; }
        .settings-btn:hover { color: #f57c00; transform: rotate(90deg); }

        .container { display: flex; height: calc(100vh - 65px); }
        .left-side { width: 300px; background: #0d0e14; border-right: 1px solid #1a1c24; padding: 20px; box-sizing: border-box; }
        .right-side { flex: 1; padding: 25px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; overflow-y: auto; }
        
        .case-card { background: #15171f; border: 1px solid #2d3245; border-radius: 15px; padding: 15px; text-align: center; cursor: pointer; transition: 0.3s; }
        .case-card:hover { border-color: #f57c00; transform: translateY(-5px); }
        .case-img { width: 100%; height: 160px; object-fit: contain; margin-bottom: 10px; border-radius: 10px; }

        /* MODAL STELLAR */
        .modal { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.95); z-index: 1000; justify-content: center; align-items: center; }
        .modal-content { background: #0d0e14; width: 90%; max-width: 800px; padding: 30px; border-radius: 20px; border: 2px solid #f57c00; text-align: center; }
        .skin-grid { display: flex; justify-content: center; gap: 10px; margin: 20px 0; overflow-x: auto; padding: 10px; }
        .skin-item { background: #15171f; padding: 10px; border-radius: 10px; border: 1px solid #333; min-width: 140px; }
        .skin-img-small { width: 100px; height: 100px; object-fit: contain; }

        .btn { width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; margin-top: 10px; }
        .btn-gold { background: #f57c00; color: black; }
        .btn-close { background: #333; color: white; width: auto; padding: 10px 30px; }

        input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: white; border-radius: 8px; margin-bottom: 15px; box-sizing: border-box; }
    </style>
</head>
<body>

    <header>
        <div style="font-size: 22px; font-weight: bold; color: #f57c00;">FX-LOOT</div>
        <div class="nav-right">
            <span id="uDisplay" style="color:#777; font-size: 12px;">ID: ...</span>
            <div class="balance-box">💰 <span id="bDisplay">0</span> Fx</div>
            <div class="settings-btn" onclick="openSettings()">⚙️</div>
        </div>
    </header>

    <div class="container">
        <div class="left-side">
            <h3 style="color:#f57c00; margin-top:0;">💎 UC XARID QILISH</h3>
            <select id="ucSelect" style="width:100%; padding:10px; background:#000; color:white; border:1px solid #333; margin-bottom:15px;">
                <option value="3000|60">60 UC - 3000 Fx</option>
                <option value="18000|360">360 UC - 18000 Fx</option>
            </select>
            <input type="text" id="promo" placeholder="Promokod">
            <button class="btn btn-gold" onclick="alert('Xarid tizimi admin tomonidan tekshirilmoqda!')">AYLANTIRISH</button>
        </div>

        <div class="right-side">
            <div class="case-card" onclick="enterCase('mummy')">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6A6Yp9XyY9XyY9XyY9XyY9XyY9XyY9XyY9X" class="case-img" onerror="this.src='https://via.placeholder.com/150/f57c00/000000?text=MUMMY'">
                <h3>MUMMY CASE</h3>
                <p style="color:#777">Narxi: 70 Fx</p>
            </div>
            <div class="case-card" onclick="enterCase('glacier')">
                <img src="https://via.placeholder.com/150/00ccff/000000?text=GLACIER" class="case-img">
                <h3>GLACIER CASE</h3>
                <p style="color:#777">Narxi: 70 Fx</p>
            </div>
        </div>
    </div>

    <div id="caseModal" class="modal">
        <div class="modal-content">
            <h2 id="modalTitle">CASE CONTENT</h2>
            <div class="skin-grid" id="skinGrid"></div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-gold" onclick="rollCase(1)">1x OCHISH (70 Fx)</button>
                <button class="btn btn-gold" style="background:#222; color:white;" onclick="rollCase(10)">10x OCHISH (700 Fx)</button>
            </div>
            <br>
            <button class="btn-close" onclick="document.getElementById('caseModal').style.display='none'">ORQAGA</button>
        </div>
    </div>

    <div id="settingsModal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <h2 style="color:#f57c00;">SOZLAMALAR</h2>
            <p style="font-size:12px; color:#777;">Maxfiy kodni kiriting:</p>
            <input type="text" id="adminCode" placeholder="Kod kiriting...">
            <button class="btn btn-gold" onclick="checkAdminCode()">TASDIQLASH</button>
            <br><br>
            <button class="btn-close" onclick="document.getElementById('settingsModal').style.display='none'">YOPISH</button>
        </div>
    </div>

    <div id="winModal" class="modal" style="flex-direction:column;">
        <h1 id="winRarity" style="margin-bottom:5px;">ITEM!</h1>
        <img id="winImg" style="width:250px; border-radius:20px; box-shadow: 0 0 20px gold;" src="">
        <h2 id="winName" style="margin:15px 0;">...</h2>
        <button class="btn btn-gold" id="sellBtn" style="width:280px;">SOTISH VA FX OLISH</button>
    </div>

    <script>
        let myId = localStorage.getItem('fxUserId') || "USER_" + Math.floor(Math.random()*999);
        localStorage.setItem('fxUserId', myId);
        let myBalance = 0;

        const SKINS = [
            { name: "Golden Mummy", rarity: "MYTHIC", price: 800, img: "https://via.placeholder.com/120/ffd700/000000?text=MUMMY" },
            { name: "M416 Glacier", rarity: "LEGENDARY", price: 600, img: "https://via.placeholder.com/120/00ccff/000000?text=GLACIER" },
            { name: "Silver", rarity: "COMMON", price: 5, img: "https://via.placeholder.com/120/cccccc/000000?text=SILVER" }
        ];

        async function updateData() {
            document.getElementById('uDisplay').innerText = "ID: " + myId;
            const res = await fetch('/api/user/' + myId);
            const user = await res.json();
            myBalance = user.fxCoin;
            document.getElementById('bDisplay').innerText = myBalance;
        }

        function enterCase(t) {
            document.getElementById('modalTitle').innerText = t.toUpperCase() + " CASE";
            document.getElementById('skinGrid').innerHTML = SKINS.map(s => \`
                <div class="skin-item">
                    <img src="\${s.img}" class="skin-img-small"><br>
                    <small>\${s.name}</small>
                </div>
            \`).join('');
            document.getElementById('caseModal').style.display = 'flex';
        }

        function openSettings() {
            document.getElementById('settingsModal').style.display = 'flex';
        }

        async function checkAdminCode() {
            const code = document.getElementById('adminCode').value;
            if(code === "admin2010") {
                await fetch('/api/user/update-balance', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ userId: myId, amount: 10000 })
                });
                alert("Muvaffaqiyatli! 10,000 FxCoin qo'shildi.");
                document.getElementById('settingsModal').style.display = 'none';
                updateData();
            } else {
                alert("Kod xato!");
            }
        }

        async function rollCase(c) {
            let cost = c * 70;
            if(myBalance < cost) return alert("Coin yetarli emas!");
            
            await fetch('/api/user/update-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:myId, amount:-cost})});
            
            let win = Math.random() < 0.1 ? SKINS[0] : (Math.random() < 0.2 ? SKINS[1] : SKINS[2]);
            
            document.getElementById('winRarity').innerText = win.rarity;
            document.getElementById('winImg').src = win.img;
            document.getElementById('winName').innerText = win.name;
            document.getElementById('sellBtn').innerText = "SOTISH (" + win.price + " Fx)";
            document.getElementById('sellBtn').onclick = () => sellItem(win.price);
            
            document.getElementById('winModal').style.display = 'flex';
            updateData();
        }

        async function sellItem(p) {
            await fetch('/api/user/update-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:myId, amount:p})});
            document.getElementById('winModal').style.display = 'none';
            updateData();
        }

        updateData();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 SERVER ON"));
