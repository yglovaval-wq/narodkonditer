const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация таблиц в базе данных
db.serialize(() => {
    // Таблица пользователей со столбцом username
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Регистрация
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [email, password], function(err) {
        if (err) {
            console.error('Ошибка при регистрации:', err.message);
            return res.status(400).json({ error: 'Пользователь с таким логином/email уже существует' });
        }
        res.json({ success: true, userId: this.lastID });
    });
});

// Авторизация (Вход)
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

// Оформление заказа
app.post('/api/orders', (req, res) => {
    const { userId, name, phone, comment } = req.body;
    db.run(`INSERT INTO orders (user_id, customer_name, phone, comment) VALUES (?, ?, ?, ?)`,
        [userId || null, name, phone, comment],
        function(err) {
            if (err) {
                console.error('Ошибка при создании заказа:', err.message);
                return res.status(500).json({ error: 'Ошибка при сохранении заказа' });
            }
            res.json({ success: true, orderId: this.lastID });
        }
    );
});

app.listen(3000, () => console.log('Сервер запущен на http://localhost:3000'));