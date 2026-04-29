const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Fanlar ro'yxati
const subjects = ["Matematika", "Dasturlash", "Ingliz tili", "Fizika"];

app.get('/', (req, res) => {
    res.send(renderFrontend());
});

io.on('connection', (socket) => {
    console.log('Foydalanuvchi ulandi');

    // Foydalanuvchi guruhga kirishi
    socket.on('join_subject', ({ username, subject }) => {
        socket.join(subject); // Uni tanlangan fan guruhiga qo'shish
        socket.username = username;
        socket.currentRoom = subject;

        // Guruhdagilarga xabar yuborish
        socket.to(subject).emit('message', {
            user: 'Tizim',
            text: `${username} ${subject} guruhiga qo'shildi!`
        });
    });

    // Xabar yuborish mantiqi
    socket.on('send_message', (data) => {
        io.to(socket.currentRoom).emit('message', {
            user: socket.username,
            text: data.text
        });
    });

    socket.on('disconnect', () => {
        console.log('Foydalanuvchi chiqib ketdi');
    });
});

function renderFrontend() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>EduChat - Bilim Ulashish</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { background: #0f172a; color: white; font-family: 'Segoe UI', sans-serif; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
            #login-screen, #chat-screen { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 90%; max-width: 400px; }
            #chat-screen { display: none; width: 600px; max-width: 95%; height: 80vh; flex-direction: column; }
            input, select, button { width: 100%; padding: 12px; margin: 10px 0; border-radius: 6px; border: none; font-size: 16px; box-sizing: border-box; }
            button { background: #3b82f6; color: white; font-weight: bold; cursor: pointer; transition: 0.3s; }
            button:hover { background: #2563eb; }
            #messages { flex: 1; overflow-y: auto; background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #334155; }
            .msg { margin-bottom: 10px; padding: 8px; border-radius: 4px; background: #334155; }
            .msg b { color: #60a5fa; }
        </style>
    </head>
    <body>
        <div id="login-screen">
            <h2 style="text-align: center; color: #3b82f6;">EduChat</h2>
            <input type="text" id="username" placeholder="Ismingizni kiriting...">
            <select id="subject-select">
                ${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
            <button onclick="join()">Guruhga kirish</button>
        </div>

        <div id="chat-screen">
            <h3 id="room-title" style="margin-top:0;"></h3>
            <div id="messages"></div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="msg-input" placeholder="Xabar yozing...">
                <button onclick="send()" style="width: 80px;">Sms</button>
            </div>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            let myName = "";

            function join() {
                myName = document.getElementById('username').value;
                const subject = document.getElementById('subject-select').value;
                if(!myName) return alert("Ismingizni kiriting!");

                socket.emit('join_subject', { username: myName, subject: subject });
                
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('chat-screen').style.display = 'flex';
                document.getElementById('room-title').innerText = subject + " Guruhi";
            }

            function send() {
                const input = document.getElementById('msg-input');
                if(input.value) {
                    socket.emit('send_message', { text: input.value });
                    input.value = "";
                }
            }

            socket.on('message', (data) => {
                const div = document.createElement('div');
                div.className = 'msg';
                div.innerHTML = \`<b>\${data.user}:</b> \${data.text}\`;
                const container = document.getElementById('messages');
                container.appendChild(div);
                container.scrollTop = container.scrollHeight;
            });
        </script>
    </body>
    </html>
    `;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("EduChat serveri ishladi!"));
