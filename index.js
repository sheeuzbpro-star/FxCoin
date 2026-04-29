const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// Ro'yxatdan o'tish uchun vaqtinchalik baza
const users = [];

// API: Ro'yxatdan o'tish
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) return res.json({ success: false, msg: "Bu ism band!" });
    users.push({ username, password });
    res.json({ success: true });
});

// Chat mantiqi
io.on('connection', (socket) => {
    socket.on('join_room', ({ username, room }) => {
        socket.join(room);
        socket.username = username;
        socket.room = room;
    });

    socket.on('send_msg', (text) => {
        // AI Botga murojaat (agar xabar /bot bilan boshlansa)
        if (text.startsWith('/bot')) {
            const question = text.replace('/bot', '').trim();
            io.to(socket.room).emit('render_msg', { user: socket.username, text: text });
            setTimeout(() => {
                io.to(socket.room).emit('render_msg', { user: '🤖 AI BOT', text: "Hozircha men o'rganyapman, tez orada '" + question + "' haqida javob beraman!" });
            }, 1000);
        } else {
            io.to(socket.room).emit('render_msg', { user: socket.username, text: text });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("EduConnect Live!"));
