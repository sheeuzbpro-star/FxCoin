// --- ADMIN API: PUL TUSHIRISH (KAFOLATLANGAN) ---
app.post('/api/admin/add', async (req, res) => {
    const { targetId, amount } = req.body;
    
    if (!targetId || !amount) {
        return res.status(400).json({ success: false, message: "ID va miqdor kiritilishi shart!" });
    }

    try {
        // ID ni probellardan tozalaymiz va bazadan qidiramiz
        const cleanId = targetId.trim();
        const user = await User.findOneAndUpdate(
            { userId: cleanId }, 
            { $inc: { balance: parseInt(amount) } }, 
            { new: true }
        );

        if (user) {
            console.log(`✅ ${cleanId} balansiga ${amount} Fx qo'shildi.`);
            res.json({ success: true, message: `Muvaffaqiyatli! ${cleanId} yangi balansi: ${user.balance} Fx` });
        } else {
            res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi! ID to'g'riligini tekshiring." });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "Server xatosi: " + e.message });
    }
});

// --- ADMIN API: BARCHA FOYDALANUVCHILARNI KO'RISH ---
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, 'userId balance');
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: "Ro'yxatni olib bo'lmadi" });
    }
});

// --- ADMIN SAHIFASI (DIZAYN VA LOGIKA) ---
app.get('/admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Professional Admin Panel</title>
    <style>
        body { background: #0a0a0a; color: #d4af37; font-family: sans-serif; padding: 40px; text-align: center; }
        .box { background: #111; border: 2px solid #d4af37; padding: 30px; border-radius: 15px; max-width: 500px; margin: auto; box-shadow: 0 0 20px rgba(212,175,55,0.3); }
        input { width: 80%; padding: 12px; margin: 10px 0; background: #222; border: 1px solid #d4af37; color: white; border-radius: 5px; font-size: 16px; }
        button { background: #d4af37; color: black; border: none; padding: 12px 30px; font-weight: bold; cursor: pointer; border-radius: 5px; margin: 10px; transition: 0.3s; }
        button:hover { background: #fff; transform: scale(1.05); }
        #status { margin-top: 20px; padding: 10px; border-radius: 5px; display: none; }
        .success { background: #004400; color: #00ff00; display: block !important; }
        .error { background: #440000; color: #ff0000; display: block !important; }
        table { width: 100%; margin-top: 30px; border-collapse: collapse; background: #111; color: white; }
        th, td { border: 1px solid #333; padding: 10px; text-align: left; }
        th { background: #d4af37; color: black; }
    </style>
</head>
<body>
    <div class="box">
        <h1>💎 FX ADMIN PANEL</h1>
        <p>Foydalanuvchi balansini to'ldirish</p>
        
        <input id="targetId" type="text" placeholder="Foydalanuvchi ID (masalan: ID123456)">
        <input id="amount" type="number" placeholder="FxCoin miqdori">
        
        <br>
        <button onclick="topUp()">PUL TUSHIRISH</button>
        <button style="background:#333; color:white;" onclick="getUsers()">USERLARNI KO'RISH</button>
        
        <div id="status"></div>
    </div>

    <div id="userListSection" style="max-width: 600px; margin: 30px auto; display:none;">
        <h3>Foydalanuvchilar Ro'yxati</h3>
        <table id="userTable">
            <thead><tr><th>User ID</th><th>Balans (Fx)</th></tr></thead>
            <tbody id="userTableBody"></tbody>
        </table>
    </div>

    <script>
        async function topUp() {
            const targetId = document.getElementById('targetId').value;
            const amount = document.getElementById('amount').value;
            const status = document.getElementById('status');

            if(!targetId || !amount) {
                status.className = 'error';
                status.innerText = "Hamma maydonlarni to'ldiring!";
                return;
            }

            try {
                const res = await fetch('/api/admin/add', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ targetId, amount })
                });
                const data = await res.json();

                if(data.success) {
                    status.className = 'success';
                    status.innerText = data.message;
                    document.getElementById('targetId').value = '';
                    document.getElementById('amount').value = '';
                } else {
                    status.className = 'error';
                    status.innerText = data.message;
                }
            } catch (e) {
                status.className = 'error';
                status.innerText = "Ulanishda xatolik!";
            }
        }

        async function getUsers() {
            const res = await fetch('/api/admin/users');
            const users = await res.json();
            const body = document.getElementById('userTableBody');
            const section = document.getElementById('userListSection');
            
            body.innerHTML = '';
            users.forEach(u => {
                body.innerHTML += \`<tr><td>\${u.userId}</td><td>\${u.balance} Fx</td></tr>\`;
            });
            section.style.display = 'block';
        }
    </script>
</body>
</html>
    `);
});
