const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'dripviet.db');
const db = new sqlite3.Database(dbPath);

const initDB = () => {
    db.serialize(() => {
        // Create Admin Users Table
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT
        )`);

        // Seed default admin (DripViet2026)
        db.get("SELECT * FROM admin_users WHERE username = 'admin'", (err, row) => {
            if (!row) {
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync('DripViet2026', salt);
                db.run("INSERT INTO admin_users (username, password_hash) VALUES ('admin', ?)", [hash]);
            }
        });

        // Create Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            customer_email TEXT,
            total_amount REAL,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Order Items Table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            item_name TEXT,
            price REAL,
            quantity INTEGER,
            customizations TEXT,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )`);
    });
};

module.exports = { db, initDB };
