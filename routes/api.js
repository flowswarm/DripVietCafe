const express = require('express');
const router = express.Router();
const { db } = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dripviet_secret_key_2026';

// Middleware to verify admin token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.adminId = decoded.id;
        next();
    });
};

// Admin Login
router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, token });
    });
});

// Submit Order (Mock Checkout)
router.post('/orders', (req, res) => {
    const { customer_name, customer_email, total_amount, items } = req.body;
    db.run(
        "INSERT INTO orders (customer_name, customer_email, total_amount, status) VALUES (?, ?, ?, 'Pending')",
        [customer_name, customer_email, total_amount],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = this.lastID;
            
            const stmt = db.prepare("INSERT INTO order_items (order_id, item_name, price, quantity, customizations) VALUES (?, ?, ?, ?, ?)");
            items.forEach(item => {
                stmt.run(orderId, item.name, item.price, item.quantity, JSON.stringify(item.customizations || {}));
            });
            stmt.finalize();
            
            res.json({ success: true, orderId });
        }
    );
});

// Get Orders (Admin)
router.get('/admin/orders', verifyToken, (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(orders);
    });
});

// Update Order Status (Admin)
router.put('/admin/orders/:id/status', verifyToken, (req, res) => {
    const { status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
