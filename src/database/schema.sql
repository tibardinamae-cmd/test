-- ============================================
-- TAKOYAKI HOUSE - DATABASE SCHEMA FOR AIVEN
-- ============================================
-- Database: MySQL 8.0 on Aiven
-- Location: Hinunangan, Southern Leyte
-- 
-- INSTRUCTIONS:
-- 1. Go to Aiven console
-- 2. Open MySQL database
-- 3. Click "Console" tab
-- 4. Copy and paste this entire SQL file
-- 5. Click "Run"
-- ============================================

CREATE DATABASE IF NOT EXISTS takoyaki_house;
USE takoyaki_house;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin and user
INSERT INTO users (name, email, password, role) VALUES 
('Admin', 'admin@takoyaki.com', 'admin123', 'admin'),
('Juan Customer', 'juan@email.com', 'user123', 'user');

-- ============================================
-- 2. MENU ITEMS TABLE
-- ============================================
CREATE TABLE menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image VARCHAR(10) NOT NULL,
    photo TEXT,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default menu items
INSERT INTO menu_items (name, price, category, image, photo, available) VALUES
('Classic Takoyaki (6 pcs)', 89.00, 'Takoyaki', 'CT', 'https://images.unsplash.com/photo-1578028078261-d7ef2b436089?w=400&h=300&fit=crop', TRUE),
('Classic Takoyaki (12 pcs)', 159.00, 'Takoyaki', 'CT', 'https://images.unsplash.com/photo-1578028078261-d7ef2b436089?w=400&h=300&fit=crop', TRUE),
('Cheesy Takoyaki', 99.00, 'Takoyaki', 'CH', 'https://images.unsplash.com/photo-1615361200141-f45040f367be?w=400&h=300&fit=crop', TRUE),
('Spicy Takoyaki', 95.00, 'Takoyaki', 'SP', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop', TRUE),
('Combo A', 149.00, 'Combo', 'CA', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop', TRUE),
('Combo B', 219.00, 'Combo', 'CB', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop', TRUE),
('French Fries', 59.00, 'Sides', 'FF', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop', TRUE),
('Iced Tea', 29.00, 'Drinks', 'IT', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', TRUE),
('Softdrinks', 25.00, 'Drinks', 'SD', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop', TRUE);

-- ============================================
-- 3. INVENTORY TABLE
-- ============================================
CREATE TABLE inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default inventory items
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
('Takoyaki Flour', 'Ingredients', 15.00, 'kg', 5.00),
('Octopus', 'Ingredients', 8.00, 'kg', 3.00),
('Eggs', 'Ingredients', 48.00, 'pcs', 20.00),
('Takoyaki Sauce', 'Sauces', 12.00, 'bottles', 4.00),
('Cooking Oil', 'Essentials', 20.00, 'liters', 5.00);

-- ============================================
-- 4. ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id INT,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'preparing', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_method ENUM('cash', 'gcash') NOT NULL,
    reference_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 5. ORDER ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
);

-- ============================================
-- 6. REFUNDS TABLE
-- ============================================
CREATE TABLE refunds (
    id INT PRIMARY KEY AUTO_INCREMENT,
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
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_refunds_user_id ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- ============================================
-- VIEWS FOR REPORTS
-- ============================================

-- Daily Sales View
CREATE VIEW daily_sales AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_orders,
    SUM(total) as total_sales,
    AVG(total) as avg_order_value
FROM orders 
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- Menu Item Sales View
CREATE VIEW menu_sales AS
SELECT 
    mi.id,
    mi.name,
    mi.category,
    COUNT(oi.id) as times_ordered,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.price * oi.quantity) as total_revenue
FROM menu_items mi
LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
GROUP BY mi.id, mi.name, mi.category;

-- Low Stock Alert View
CREATE VIEW low_stock_items AS
SELECT * FROM inventory WHERE quantity <= min_stock;
