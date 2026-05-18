// ============================================
// EXPRESS SERVER EXAMPLE FOR TAKOYAKI HOUSE
// ============================================
// Run: npm init -y && npm install express mysql2 cors dotenv
// Then: node server-example.js
// ============================================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// DATABASE CONNECTION
// ============================================
const pool = mysql.createPool({
  host: process.env.AIVEN_DB_HOST,
  port: parseInt(process.env.AIVEN_DB_PORT || '25060'),
  database: process.env.AIVEN_DB_NAME,
  user: process.env.AIVEN_DB_USER,
  password: process.env.AIVEN_DB_PASSWORD,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
});

// ============================================
// AUTH ROUTES
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    const user = rows[0];
    if (user) {
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// MENU ROUTES
// ============================================

// Get all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM menu_items ORDER BY category, name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add menu item
app.post('/api/menu', async (req, res) => {
  try {
    const { name, price, category, image, photo } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO menu_items (name, price, category, image, photo) VALUES (?, ?, ?, ?, ?)',
      [name, price, category, image, photo]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update menu item
app.put('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, image, photo, available } = req.body;
    await pool.execute(
      'UPDATE menu_items SET name = ?, price = ?, category = ?, image = ?, photo = ?, available = ? WHERE id = ?',
      [name, price, category, image, photo, available, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete menu item
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// ORDER ROUTES
// ============================================

// Get orders
app.get('/api/orders', async (req, res) => {
  try {
    const { userId, status } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }
    if (status) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    
    const [orders] = await pool.execute(query, params);
    
    // Get items for each order
    for (let order of orders) {
      const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items, total, paymentMethod, referenceCode } = req.body;
    const orderCode = `ORD-${Date.now()}`;
    
    // Create order
    const [orderResult] = await pool.execute(
      'INSERT INTO orders (order_code, user_id, total, payment_method, reference_code) VALUES (?, ?, ?, ?, ?)',
      [orderCode, userId, total, paymentMethod, referenceCode || null]
    );
    const orderId = orderResult.insertId;
    
    // Create order items
    for (const item of items) {
      await pool.execute(
        'INSERT INTO order_items (order_id, menu_item_id, item_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.menuItemId, item.name, item.price, item.quantity]
      );
    }
    
    res.json({ success: true, orderId, orderCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// INVENTORY ROUTES
// ============================================

app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM inventory ORDER BY category, name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { name, category, quantity, unit, minStock } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES (?, ?, ?, ?, ?)',
      [name, category, quantity, unit, minStock]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, quantity, unit, minStock } = req.body;
    await pool.execute(
      'UPDATE inventory SET name = ?, category = ?, quantity = ?, unit = ?, min_stock = ? WHERE id = ?',
      [name, category, quantity, unit, minStock, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM inventory WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// REFUND ROUTES
// ============================================

app.get('/api/refunds', async (req, res) => {
  try {
    const { userId } = req.query;
    let query = 'SELECT * FROM refunds';
    const params = [];
    
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/refunds', async (req, res) => {
  try {
    const { orderId, userId, userName, reason, amount } = req.body;
    const refundCode = `REF-${Date.now()}`;
    const [result] = await pool.execute(
      'INSERT INTO refunds (refund_code, order_id, user_id, user_name, reason, amount) VALUES (?, ?, ?, ?, ?, ?)',
      [refundCode, orderId, userId, userName, reason, amount]
    );
    res.json({ success: true, id: result.insertId, refundCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/refunds/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.execute('UPDATE refunds SET status = ? WHERE id = ?', [status, id]);
    
    if (status === 'approved') {
      const [refund] = await pool.execute('SELECT order_id FROM refunds WHERE id = ?', [id]);
      if (refund[0]) {
        await pool.execute('UPDATE orders SET status = "refunded" WHERE id = ?', [refund[0].order_id]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// SALES REPORT ROUTES
// ============================================

app.get('/api/sales', async (req, res) => {
  try {
    const [sales] = await pool.execute(`
      SELECT * FROM daily_sales ORDER BY sale_date DESC LIMIT 30
    `);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/sales/stats', async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total) as total_sales,
        AVG(total) as avg_order_value
      FROM orders WHERE status = 'completed'
    `);
    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Connected to Aiven MySQL database');
});
