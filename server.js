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

// Раздача статических файлов из папки public/
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

// Создание таблиц при первом запуске
db.serialize(() => {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        name TEXT,
        items TEXT,
        totalPrice REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// ==========================================
// API ЭНДПОИНТЫ
// ==========================================

// Маршрут оформления заказа (вызывается из cart.html)
app.post('/api/orders', (req, res) => {
    const { userId, name, items, totalPrice } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Корзина пуста' });
    }

    const itemsJson = JSON.stringify(items);
    const query = `INSERT INTO orders (userId, name, items, totalPrice) VALUES (?, ?, ?, ?)`;

    db.run(query, [userId || null, name || 'Гость', itemsJson, totalPrice], function (err) {
        if (err) {
            console.error('Ошибка добавления заказа:', err.message);
            return res.status(500).json({ success: false, error: 'Ошибка сохранения заказа в базе данных' });
        }

        console.log(`Заказ №${this.lastID} успешно сохранен.`);
        res.json({
            success: true,
            orderId: this.lastID,
            message: 'Заказ успешно оформлен!'
        });
    });
});

// Маршрут получения списка всех заказов
app.get('/api/orders', (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        const orders = rows.map(order => ({
            ...order,
            items: JSON.parse(order.items)
        }));
        res.json({ success: true, orders });
    });
});

// ==========================================
// МАРШРУТЫ СТРАНИЦ (из папки public)
// ==========================================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Перенаправление всех остальных запросов на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен и работает на порту ${PORT}`);
});
