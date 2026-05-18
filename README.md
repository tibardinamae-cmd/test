# 🐙 Takoyaki House POS System

Point of Sale system for Takoyaki House in Hinunangan, Southern Leyte.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Aiven Database
1. Go to https://aiven.io and create account
2. Create MySQL database (free tier available)
3. Copy the connection details
4. Update `.env` file with your credentials

### 3. Setup Database Tables
1. Open Aiven MySQL Console
2. Run the SQL in `src/database/schema.sql`

### 4. Start Development
```bash
npm run dev
```

### 5. Build & Run Production
```bash
npm run build
npm start
```

## Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@takoyaki.com | admin123 | admin |
| juan@email.com | user123 | user |

## Environment Variables (.env)

```
MYSQL_HOST=your-host.aivencloud.com
MYSQL_USER=avnadmin
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=takoyaki_house
MYSQL_PORT=25060
PORT=3000
```

## Features

### Admin Dashboard
- View sales statistics
- Take orders (POS)
- Manage orders
- Manage inventory
- Manage menu items
- Handle refund requests
- View sales reports

### User Dashboard
- Browse menu with photos
- Add items to cart
- Place orders (Cash/GCash)
- Track order status
- Request refunds
- View refund status

## API Endpoints

### Auth
- `POST /api/auth/login` - Login

### Menu
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Add menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Orders
- `GET /api/orders` - Get orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order

### Inventory
- `GET /api/inventory` - Get inventory
- `POST /api/inventory` - Add inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item

### Refunds
- `GET /api/refunds` - Get refunds
- `POST /api/refunds` - Create refund request
- `PUT /api/refunds/:id/status` - Update refund status

### Sales
- `GET /api/sales/stats` - Get sales statistics
- `GET /api/sales/daily` - Get daily sales
- `GET /api/sales/menu` - Get menu item sales

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- Database: MySQL (Aiven)
