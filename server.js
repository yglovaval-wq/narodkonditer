const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
// Render автоматически передает порт через переменную окружения process.env.PORT
const PORT = process.env.PORT || 3000;

// Мидлвары
app.use(cors());
app.use(express.json());

// 1. Раздача статических файлов из папки public/
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных SQLite
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных:', err.message);
    } else {
        console.log('Успешное подключение к базе данных SQLite.');
    }
});

// Создание таблиц при запуске
db.serialize(() => {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT,
        phone TEXT,
        comment TEXT,
        items TEXT,
        total_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// ==========================================
// API ЭНДПОИНТЫ
// ==========================================

// Регистрация
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [email, password], function(err) {
        if (err) {
            console.error('Ошибка при регистрации:', err.message);
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        res.json({ success: true, userId: this.lastID });
    });
});

// Вход
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }

    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [email, password], (err, user) => {
        if (err) {
            console.error('Ошибка БД при входе:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        if (!user) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }
        res.json({ success: true, user: { id: user.id, username: user.username } });
    });
});

// Сохранение заказа из cart.html
app.post('/api/orders', (req, res) => {
    const { userId, name, phone, comment, items, totalPrice } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Корзина пуста' });
    }

    const itemsJson = JSON.stringify(items);
    const query = `INSERT INTO orders (user_id, customer_name, phone, comment, items, total_price) VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(query, [userId || null, name || 'Гость', phone || null, comment || null, itemsJson, totalPrice || 0], function (err) {
        if (err) {
            console.error('Ошибка при создании заказа:', err.message);
            return res.status(500).json({ success: false, error: 'Ошибка при сохранении заказа' });
        }
        res.json({ success: true, orderId: this.lastID });
    });
});

// ==========================================
// МАРШРУТЫ ДЛЯ СТРАНИЦ
// ==========================================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Все остальные запросы перенаправляем на public/index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен и работает на порту ${PORT}`);
});
