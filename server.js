require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const { fileURLToPath } = require('url');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// ============================================
// DATABASE CONNECTION (Aiven MySQL)
// ============================================
let pool;
try {
    pool = mysql.createPool({
        uri: process.env.MYSQL_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log("✅ Connected to Aiven MySQL database");
} catch (err) {
    console.error("❌ Database Connection Failed:", err.message);
}

// Test connection on startup
const testConnection = async () => {
    try {
        await pool.query('SELECT 1');
        console.log("✅ Database connection verified");
    } catch (err) {
        console.error("❌ Database connection test failed:", err.message);
    }
};
testConnection();

// ============================================
// INITIALIZE DATABASE TABLES
// ============================================
const initDB = async () => {
    try {
        console.log("📝 Initializing database tables...");

        // Users table - for login
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("  ✓ users table ready");

        // Menu items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(50) NOT NULL,
                image VARCHAR(10) NOT NULL,
                photo TEXT,
                available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("  ✓ menu_items table ready");

        // Orders table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_code VARCHAR(50) UNIQUE NOT NULL,
                user_id INT,
                total DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'preparing', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
                payment_method ENUM('cash', 'gcash') NOT NULL,
                reference_code VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("  ✓ orders table ready");

        // Order items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                item_name VARCHAR(150) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
            )
        `);
        console.log("  ✓ order_items table ready");

        // Inventory table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
                unit VARCHAR(20) NOT NULL,
                min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("  ✓ inventory table ready");

        // Refunds table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refunds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                refund_code VARCHAR(50) UNIQUE NOT NULL,
                order_id INT NOT NULL,
                user_id INT NOT NULL,
                user_name VARCHAR(100) NOT NULL,
                reason TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("  ✓ refunds table ready");

        // Insert default users if not exists
        const [existingUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
        if (existingUsers[0].count === 0) {
            console.log("📝 Creating default users...");
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin', 'admin@takoyaki.com', 'admin123', 'admin']
            );
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Juan Customer', 'juan@email.com', 'user123', 'user']
            );
            console.log("  ✓ Default users created:");
            console.log("    - admin@takoyaki.com / admin123 (admin)");
            console.log("    - juan@email.com / user123 (user)");
        }

        // Insert default menu items if not exists
        const [existingMenu] = await pool.query('SELECT COUNT(*) as count FROM menu_items');
        if (existingMenu[0].count === 0) {
            console.log("📝 Creating default menu items...");
            await pool.query(`
                INSERT INTO menu_items (name, price, category, image, photo, available) VALUES
                ('Classic Takoyaki (6 pcs)', 89.00, 'Takoyaki', 'CT', 'https://images.unsplash.com/photo-1578028078261-d7ef2b436089?w=400&h=300&fit=crop', TRUE),
                ('Classic Takoyaki (12 pcs)', 159.00, 'Takoyaki', 'CT', 'https://images.unsplash.com/photo-1578028078261-d7ef2b436089?w=400&h=300&fit=crop', TRUE),
                ('Cheesy Takoyaki', 99.00, 'Takoyaki', 'CH', 'https://images.unsplash.com/photo-1615361200141-f45040f367be?w=400&h=300&fit=crop', TRUE),
                ('Spicy Takoyaki', 95.00, 'Takoyaki', 'SP', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop', TRUE),
                ('Combo A', 149.00, 'Combo', 'CA', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop', TRUE),
                ('Combo B', 219.00, 'Combo', 'CB', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop', TRUE),
                ('French Fries', 59.00, 'Sides', 'FF', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop', TRUE),
                ('Iced Tea', 29.00, 'Drinks', 'IT', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', TRUE),
                ('Softdrinks', 25.00, 'Drinks', 'SD', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop', TRUE)
            `);
            console.log("  ✓ Default menu items created");
        }

        // Insert default inventory if not exists
        const [existingInventory] = await pool.query('SELECT COUNT(*) as count FROM inventory');
        if (existingInventory[0].count === 0) {
            console.log("📝 Creating default inventory...");
            await pool.query(`
                INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
                ('Takoyaki Flour', 'Ingredients', 15.00, 'kg', 5.00),
                ('Octopus', 'Ingredients', 8.00, 'kg', 3.00),
                ('Eggs', 'Ingredients', 48.00, 'pcs', 20.00),
                ('Takoyaki Sauce', 'Sauces', 12.00, 'bottles', 4.00),
                ('Cooking Oil', 'Essentials', 20.00, 'liters', 5.00)
            `);
            console.log("  ✓ Default inventory created");
        }

        console.log("✅ Database initialization complete!");
    } catch (err) {
        console.error("❌ Database Initialization Error:", err.message);
    }
};
initDB();

// ============================================
// AUTH API - Users Table Login
// ============================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt: ${email}`);
    
    try {
        // Query users table for matching email and password
        const [rows] = await pool.query(
            'SELECT id, name, email, role FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        
        if (rows.length > 0) {
            const user = rows[0];
            console.log(`✅ Login successful: ${user.name} (${user.role})`);
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            console.log(`❌ Invalid credentials for: ${email}`);
            res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
    } catch (err) {
        console.error("❌ Login error:", err.message);
        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
});

// Get all users (for admin)
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new user
app.post('/api/users', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, role || 'user']
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MENU API
// ============================================
app.get('/api/menu', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY category, name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/menu', async (req, res) => {
    const { name, price, category, image, photo, available } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO menu_items (name, price, category, image, photo, available) VALUES (?, ?, ?, ?, ?, ?)',
            [name, price, category, image, photo || '', available !== false]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/menu/:id', async (req, res) => {
    const { name, price, category, image, photo, available } = req.body;
    try {
        await pool.query(
            'UPDATE menu_items SET name=?, price=?, category=?, image=?, photo=?, available=? WHERE id=?',
            [name, price, category, image, photo, available, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/menu/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ORDERS API
// ============================================
app.get('/api/orders', async (req, res) => {
    const { userId, status } = req.query;
    try {
        let query = 'SELECT * FROM orders';
        const params = [];
        const conditions = [];

        if (userId) { conditions.push('user_id = ?'); params.push(userId); }
        if (status) { conditions.push('status = ?'); params.push(status); }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY created_at DESC';

        const [orders] = await pool.query(query, params);
        for (let order of orders) {
            const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
            order.items = items;
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const { userId, items, total, paymentMethod, referenceCode } = req.body;
    const orderCode = `ORD-${Date.now()}`;
    try {
        const [result] = await pool.query(
            'INSERT INTO orders (order_code, user_id, total, payment_method, reference_code) VALUES (?, ?, ?, ?, ?)',
            [orderCode, userId, total, paymentMethod, referenceCode || null]
        );
        const orderId = result.insertId;
        for (const item of items) {
            await pool.query(
                'INSERT INTO order_items (order_id, menu_item_id, item_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.menuItemId, item.name, item.price, item.quantity]
            );
        }
        res.status(201).json({ success: true, orderId, orderCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// INVENTORY API
// ============================================
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY category, name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory', async (req, res) => {
    const { name, category, quantity, unit, minStock } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES (?, ?, ?, ?, ?)',
            [name, category, quantity, unit, minStock]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/inventory/:id', async (req, res) => {
    const { name, category, quantity, unit, minStock } = req.body;
    try {
        await pool.query(
            'UPDATE inventory SET name=?, category=?, quantity=?, unit=?, min_stock=? WHERE id=?',
            [name, category, quantity, unit, minStock, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// REFUNDS API
// ============================================
app.get('/api/refunds', async (req, res) => {
    const { userId } = req.query;
    try {
        let query = 'SELECT * FROM refunds';
        const params = [];
        if (userId) { query += ' WHERE user_id = ?'; params.push(userId); }
        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/refunds', async (req, res) => {
    const { orderId, userId, userName, reason, amount } = req.body;
    const refundCode = `REF-${Date.now()}`;
    try {
        const [result] = await pool.query(
            'INSERT INTO refunds (refund_code, order_id, user_id, user_name, reason, amount) VALUES (?, ?, ?, ?, ?, ?)',
            [refundCode, orderId, userId, userName, reason, amount]
        );
        res.status(201).json({ success: true, id: result.insertId, refundCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/refunds/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE refunds SET status = ? WHERE id = ?', [status, req.params.id]);
        if (status === 'approved') {
            const [refund] = await pool.query('SELECT order_id FROM refunds WHERE id = ?', [req.params.id]);
            if (refund[0]) {
                await pool.query('UPDATE orders SET status = "refunded" WHERE id = ?', [refund[0].order_id]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SALES API
// ============================================
app.get('/api/sales/stats', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total), 0) as total_sales,
                COALESCE(AVG(total), 0) as avg_order_value
            FROM orders WHERE status = 'completed'
        `);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// REACT FALLBACK - Serve index.html
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📍 Takoyaki House POS System`);
    console.log(`🌐 http://localhost:${port}`);
});
