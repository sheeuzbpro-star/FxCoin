const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    // Guruhga qo'shilish
    socket.on('join_room', ({ username, subject }) => {
        socket.join(subject); // Foydalanuvchini fan xonasiga kiritish
        socket.username = username;
        socket.room = subject;

        // Guruhga xabar: "Falonchi kirdi"
        socket.to(subject).emit('sys_msg', `${username} o'quv guruhiga qo'shildi!`);
    });

    // Xabar almashish
    socket.on('chat_msg', (msg) => {
        io.to(socket.room).emit('render_msg', {
            user: socket.username,
            text: msg
        });
    });
});

server.listen(3000, () => console.log("Bilim platformasi yoqildi!"));
