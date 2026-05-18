// ============================================
// BACKEND API FUNCTIONS FOR AIVEN DATABASE
// ============================================
// This file contains all database operations
// Run this on your backend server (Node.js/Express)
// ============================================

import mysql from 'mysql2/promise';
import { dbConfig } from './config';

// Create connection pool
const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  ssl: dbConfig.ssl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ============================================
// USER FUNCTIONS
// ============================================

export async function getUserByEmail(email: string) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return (rows as any[])[0] || null;
}

export async function getUserById(id: number) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
}

export async function createUser(name: string, email: string, password: string, role: string = 'user') {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, password, role]
  );
  return (result as any).insertId;
}

// ============================================
// MENU FUNCTIONS
// ============================================

export async function getAllMenuItems() {
  const [rows] = await pool.execute('SELECT * FROM menu_items ORDER BY category, name');
  return rows as any[];
}

export async function getMenuItemById(id: number) {
  const [rows] = await pool.execute('SELECT * FROM menu_items WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
}

export async function createMenuItem(name: string, price: number, category: string, image: string, photo: string) {
  const [result] = await pool.execute(
    'INSERT INTO menu_items (name, price, category, image, photo) VALUES (?, ?, ?, ?, ?)',
    [name, price, category, image, photo]
  );
  return (result as any).insertId;
}

export async function updateMenuItem(id: number, name: string, price: number, category: string, image: string, photo: string, available: boolean) {
  await pool.execute(
    'UPDATE menu_items SET name = ?, price = ?, category = ?, image = ?, photo = ?, available = ? WHERE id = ?',
    [name, price, category, image, photo, available, id]
  );
}

export async function deleteMenuItem(id: number) {
  await pool.execute('DELETE FROM menu_items WHERE id = ?', [id]);
}

// ============================================
// INVENTORY FUNCTIONS
// ============================================

export async function getAllInventory() {
  const [rows] = await pool.execute('SELECT * FROM inventory ORDER BY category, name');
  return rows as any[];
}

export async function getLowStockItems() {
  const [rows] = await pool.execute('SELECT * FROM inventory WHERE quantity <= min_stock');
  return rows as any[];
}

export async function createInventoryItem(name: string, category: string, quantity: number, unit: string, minStock: number) {
  const [result] = await pool.execute(
    'INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES (?, ?, ?, ?, ?)',
    [name, category, quantity, unit, minStock]
  );
  return (result as any).insertId;
}

export async function updateInventoryItem(id: number, name: string, category: string, quantity: number, unit: string, minStock: number) {
  await pool.execute(
    'UPDATE inventory SET name = ?, category = ?, quantity = ?, unit = ?, min_stock = ? WHERE id = ?',
    [name, category, quantity, unit, minStock, id]
  );
}

export async function deleteInventoryItem(id: number) {
  await pool.execute('DELETE FROM inventory WHERE id = ?', [id]);
}

// ============================================
// ORDER FUNCTIONS
// ============================================

export async function createOrder(orderCode: string, userId: number, total: number, paymentMethod: string, referenceCode?: string) {
  const [result] = await pool.execute(
    'INSERT INTO orders (order_code, user_id, total, payment_method, reference_code) VALUES (?, ?, ?, ?, ?)',
    [orderCode, userId, total, paymentMethod, referenceCode || null]
  );
  return (result as any).insertId;
}

export async function createOrderItem(orderId: number, menuItemId: number, itemName: string, price: number, quantity: number) {
  await pool.execute(
    'INSERT INTO order_items (order_id, menu_item_id, item_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
    [orderId, menuItemId, itemName, price, quantity]
  );
}

export async function getOrders(userId?: number, status?: string) {
  let query = 'SELECT * FROM orders';
  const params: any[] = [];
  
  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
  } else if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const [rows] = await pool.execute(query, params);
  return rows as any[];
}

export async function getOrderById(id: number) {
  const [order] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
  const [items] = await pool.execute(
    'SELECT * FROM order_items WHERE order_id = ?',
    [id]
  );
  return {
    ...(order as any[])[0],
    items: items as any[]
  };
}

export async function getOrderItems(orderId: number) {
  const [rows] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return rows as any[];
}

export async function updateOrderStatus(id: number, status: string) {
  await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteOrder(id: number) {
  await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
}

// ============================================
// REFUND FUNCTIONS
// ============================================

export async function createRefund(refundCode: string, orderId: number, userId: number, userName: string, reason: string, amount: number) {
  const [result] = await pool.execute(
    'INSERT INTO refunds (refund_code, order_id, user_id, user_name, reason, amount) VALUES (?, ?, ?, ?, ?, ?)',
    [refundCode, orderId, userId, userName, reason, amount]
  );
  return (result as any).insertId;
}

export async function getRefunds(userId?: number, status?: string) {
  let query = 'SELECT * FROM refunds';
  const params: any[] = [];
  
  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
  } else if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const [rows] = await pool.execute(query, params);
  return rows as any[];
}

export async function updateRefundStatus(id: number, status: string) {
  await pool.execute('UPDATE refunds SET status = ? WHERE id = ?', [status, id]);
  
  // If approved, update order status to refunded
  if (status === 'approved') {
    const [refund] = await pool.execute('SELECT order_id FROM refunds WHERE id = ?', [id]);
    const refundData = (refund as any[])[0];
    if (refundData) {
      await pool.execute('UPDATE orders SET status = "refunded" WHERE id = ?', [refundData.order_id]);
    }
  }
}

// ============================================
// REPORT FUNCTIONS
// ============================================

export async function getDailySales() {
  const [rows] = await pool.execute('SELECT * FROM daily_sales ORDER BY sale_date DESC LIMIT 30');
  return rows as any[];
}

export async function getMenuSales() {
  const [rows] = await pool.execute('SELECT * FROM menu_sales ORDER BY total_quantity DESC');
  return rows as any[];
}

export async function getSalesStats(startDate?: string, endDate?: string) {
  let query = `
    SELECT 
      COUNT(*) as total_orders,
      SUM(total) as total_sales,
      AVG(total) as avg_order_value,
      SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_sales,
      SUM(CASE WHEN payment_method = 'gcash' THEN total ELSE 0 END) as gcash_sales
    FROM orders 
    WHERE status = 'completed'
  `;
  const params: any[] = [];
  
  if (startDate) {
    query += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND created_at <= ?';
    params.push(endDate);
  }
  
  const [rows] = await pool.execute(query, params);
  return (rows as any[])[0];
}

// ============================================
// TEST CONNECTION
// ============================================

export async function testConnection() {
  try {
    await pool.execute('SELECT 1');
    console.log('Database connected successfully!');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
