const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware'lar
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'super_secret_key_for_education_platform',
    resave: false,
    saveUninitialized: true
}));

// ==========================================
// 1. MA'LUMOTLAR BAZASI (JSON) MANTIG'I
// ==========================================
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [],
            courses: [
                { id: 1, title: 'JavaScript Asoslari', category: 'Dasturlash', description: 'Noldan JS va Node.js o\'rganamiz.' },
                { id: 2, title: 'Veb Dizayn (UI/UX)', category: 'Dizayn', description: 'Figma yordamida zamonaviy interfeyslar yaratish.' },
                { id: 3, title: 'Ingliz Tili (Beginner)', category: 'Tillar', description: 'Boshlang\'ich darajadagi ingliz tili darslari.' }
            ],
            lessons: [
                { id: 1, course_id: 1, title: '1-Dars: Kirish va O\'rnatish', content: 'Node.js o\'rnatish va birinchi kod.', video_url: 'https://www.youtube.com/embed/dummy1' },
                { id: 2, course_id: 1, title: '2-Dars: O\'zgaruvchilar', content: 'let, const, var va ma\'lumotlar turlari.', video_url: 'https://www.youtube.com/embed/dummy2' },
                { id: 3, course_id: 2, title: '1-Dars: Figma bilan tanishuv', content: 'Figma dasturining asosiy asboblari.', video_url: 'https://www.youtube.com/embed/dummy3' }
            ]
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 4), 'utf8');
    }
}

function readDB() {
    initDB();
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4), 'utf8');
}

// ==========================================
// 2. HTML SHABLONLAR (UI)
// ==========================================
function getFlashMessage(req) {
    const msg = req.session.message;
    req.session.message = null; // o'qilgandan so'ng tozalash
    return msg ? `<div class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-3 rounded mb-4">${msg}</div>` : '';
}

function renderPage(req, content) {
    return `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EduFree - Bepul Ta'lim</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = { darkMode: 'class' }
            function toggleDark() {
                document.documentElement.classList.toggle('dark');
            }
        </script>
        <style>body { transition: background-color 0.3s, color 0.3s; }</style>
    </head>
    <body class="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 min-h-screen flex flex-col">
        <!-- Navbar -->
        <nav class="bg-white dark:bg-gray-800 shadow p-4">
            <div class="container mx-auto flex justify-between items-center">
                <a href="/" class="text-2xl font-bold text-blue-600 dark:text-blue-400">EduFree</a>
                <div class="flex items-center space-x-4">
                    <a href="/courses" class="hover:text-blue-500">Kurslar</a>
                    <button onclick="toggleDark()" class="p-2 rounded bg-gray-200 dark:bg-gray-700">🌓</button>
                    ${req.session.userId 
                        ? `<span class="font-semibold">${req.session.username}</span> <a href="/logout" class="text-red-500">Chiqish</a>` 
                        : `<a href="/login" class="text-blue-500">Kirish</a>`
                    }
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="container mx-auto p-4 flex-grow">
            ${getFlashMessage(req)}
            ${content}
        </main>

        <!-- Footer -->
        <footer class="bg-white dark:bg-gray-800 text-center p-4 mt-8 shadow-inner">
            <p>&copy; 2026 EduFree. Ta'lim hamma uchun bepul bo'lishi kerak.</p>
        </footer>
    </body>
    </html>
    `;
}

// ==========================================
// 3. ROUTELAR (Backend mantiq)
// ==========================================

// Bosh sahifa
app.get('/', (req, res) => {
    const db = readDB();
    const featuredCourses = db.courses.slice(0, 3);
    
    let coursesHtml = featuredCourses.map(c => `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
            <span class="text-sm font-bold text-blue-500 uppercase">${c.category}</span>
            <h3 class="text-xl font-bold mt-2">${c.title}</h3>
            <p class="text-gray-600 dark:text-gray-400 mt-2 mb-4">${c.description}</p>
            <a href="/course/${c.id}" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Kursni ko'rish &rarr;</a>
        </div>
    `).join('');

    const content = `
        <div class="text-center py-12">
            <h1 class="text-5xl font-bold mb-4">Ta'lim hamma uchun bepul bo'lishi kerak</h1>
            <p class="text-xl mb-8 text-gray-600 dark:text-gray-300">Dasturlash, dizayn va tillarni mutlaqo bepul o'rganing. Kelajagingizni bugun qurishni boshlang.</p>
            <a href="/courses" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg">Boshlash</a>
        </div>
        <div class="mt-12">
            <h2 class="text-3xl font-bold mb-6 border-b pb-2">Tavsiya etilgan kurslar</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${coursesHtml}
            </div>
        </div>
    `;
    res.send(renderPage(req, content));
});

// Barcha kurslar va Qidiruv
app.get('/courses', (req, res) => {
    const db = readDB();
    const query = (req.query.q || '').toLowerCase();
    
    let filteredCourses = db.courses;
    if (query) {
        filteredCourses = db.courses.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));
    }

    let coursesHtml = filteredCourses.length ? filteredCourses.map(c => `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
            <h3 class="text-xl font-bold">${c.title}</h3>
            <p class="text-gray-600 dark:text-gray-400 mt-2 mb-4">${c.description}</p>
            <a href="/course/${c.id}" class="bg-gray-200 dark:bg-gray-700 py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600 block text-center">O'qishni boshlash</a>
        </div>
    `).join('') : '<p>Hech narsa topilmadi.</p>';

    const content = `
        <h1 class="text-3xl font-bold mb-6">Barcha Kurslar</h1>
        <form method="GET" action="/courses" class="mb-8 flex">
            <input type="text" name="q" value="${req.query.q || ''}" placeholder="Kurslarni qidirish..." class="w-full p-3 rounded-l border dark:bg-gray-700 dark:border-gray-600 outline-none">
            <button type="submit" class="bg-blue-600 text-white px-6 rounded-r">Qidirish</button>
        </form>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${coursesHtml}
        </div>
    `;
    res.send(renderPage(req, content));
});

// Kurs haqida ma'lumot va darslar
app.get('/course/:id', (req, res) => {
    const db = readDB();
    const courseId = parseInt(req.params.id);
    const course = db.courses.find(c => c.id === courseId);
    
    if (!course) return res.send(renderPage(req, '<h1>Kurs topilmadi</h1>'));

    const lessons = db.lessons.filter(l => l.course_id === courseId);
    
    let lessonsHtml = lessons.length ? lessons.map(l => `
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow border dark:border-gray-700">
            <h3 class="text-xl font-semibold mb-2">${l.title}</h3>
            <p class="mb-4">${l.content}</p>
            ${l.video_url ? `<div class="bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center h-64 mb-4"><span class="text-gray-500">[Video Player: ${l.video_url}]</span></div>` : ''}
            <button class="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm">Bajarildi deb belgilash</button>
        </div>
    `).join('') : '<p>Tez orada darslar qo\'shiladi.</p>';

    const content = `
        <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl font-bold mb-2">${course.title}</h1>
            <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">${course.description}</p>
            <h2 class="text-2xl font-bold mb-4">Darslar ro'yxati</h2>
            <div class="space-y-4">
                ${lessonsHtml}
            </div>
        </div>
    `;
    res.send(renderPage(req, content));
});

// Ro'yxatdan o'tish shabloni
const authTemplate = (title, isLogin) => `
    <div class="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow border dark:border-gray-700 mt-12">
        <h2 class="text-2xl font-bold mb-6 text-center">${title}</h2>
        <form method="POST">
            <div class="mb-4">
                <label class="block mb-1">Foydalanuvchi nomi</label>
                <input type="text" name="username" required class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
            </div>
            <div class="mb-6">
                <label class="block mb-1">Parol</label>
                <input type="password" name="password" required class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2 rounded">${title}</button>
        </form>
        <div class="mt-4 text-center">
            ${isLogin ? `<a href="/register" class="text-blue-500 hover:underline">Ro'yxatdan o'tish</a>` : `<a href="/login" class="text-blue-500 hover:underline">Akkaunt bormi? Kirish</a>`}
        </div>
    </div>
`;

// Ro'yxatdan o'tish
app.route('/register')
    .get((req, res) => res.send(renderPage(req, authTemplate("Ro'yxatdan o'tish", false))))
    .post((req, res) => {
        const { username, password } = req.body;
        const db = readDB();
        
        if (db.users.find(u => u.username === username)) {
            req.session.message = "Bu ism band.";
            return res.redirect('/register');
        }

        const newUser = { id: Date.now(), username, password }; // Real proyektda parolni hash qilish kerak (masalan, bcrypt orqali)
        db.users.push(newUser);
        writeDB(db);

        req.session.message = "Muvaffaqiyatli ro'yxatdan o'tdingiz! Iltimos, tizimga kiring.";
        res.redirect('/login');
    });

// Kirish
app.route('/login')
    .get((req, res) => res.send(renderPage(req, authTemplate("Kirish", true))))
    .post((req, res) => {
        const { username, password } = req.body;
        const db = readDB();
        const user = db.users.find(u => u.username === username && u.password === password);

        if (user) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.message = "Tizimga kirdingiz.";
            res.redirect('/');
        } else {
            req.session.message = "Ism yoki parol noto'g'ri.";
            res.redirect('/login');
        }
    });

// Chiqish
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Serverni ishga tushirish
app.listen(PORT, () => {
    initDB();
    console.log(`Server ishladi: http://localhost:${PORT}`);
});
