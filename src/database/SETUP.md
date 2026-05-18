# Aiven Database Setup Guide for Takoyaki House

## Step 1: Create Aiven Account
1. Go to https://aiven.io
2. Sign up for free account
3. Get $300 free credits

## Step 2: Create MySQL Database
1. Click "Create Service"
2. Select "MySQL"
3. Choose cloud provider (AWS/GCP)
4. Select region closest to Philippines (e.g., Singapore)
5. Choose plan: "Hobby - Dev" (free tier)
6. Click "Create Service"

## Step 3: Get Connection Details
1. Go to your service page
2. Click "Overview" tab
3. Copy these values:
   - Service URI: `mysql://avnadmin:PASSWORD@HOST:PORT/DATABASE`
   - Host
   - Port
   - Username
   - Password

## Step 4: Run SQL Schema
1. Go to "Service URI" and copy it
2. Use MySQL Workbench or any SQL client
3. Connect using the URI
4. Open `src/database/schema.sql`
5. Run all the SQL commands to create tables

## Step 5: Configure Environment Variables
Create `.env` file in project root:

```env
# Aiven Database Configuration
AIVEN_DB_HOST=your-host.aivencloud.com
AIVEN_DB_PORT=25060
AIVEN_DB_NAME=takoyaki_house
AIVEN_DB_USER=avnadmin
AIVEN_DB_PASSWORD=your-password
AIVEN_DATABASE_URL=mysql://avnadmin:password@host:25060/takoyaki_house?ssl-mode=required
```

## Step 6: Install MySQL Package
```bash
npm install mysql2
```

## Step 7: Connect Backend
Copy files from `src/database/` to your backend server:
- `config.ts` - Database configuration
- `api.ts` - API functions

## Connection String Format
```
mysql://avnadmin:PASSWORD@HOST:PORT/DATABASE_NAME?ssl-mode=required
```

Example:
```
mysql://avnadmin:abc123xyz@my-takoyaki-db-abc123.aivencloud.com:25060/takoyaki_house?ssl-mode=required
```

## Default Login Credentials
After running schema.sql:

| Email | Password | Role |
|-------|----------|------|
| admin@takoyaki.com | admin123 | admin |
| juan@email.com | user123 | user |

## Database Tables Created
1. `users` - User accounts
2. `menu_items` - Menu products with photos
3. `inventory` - Stock management
4. `orders` - Customer orders
5. `order_items` - Items in each order
6. `refunds` - Refund requests

## Views Created
1. `daily_sales` - Daily sales report
2. `menu_sales` - Sales by menu item
3. `low_stock_items` - Items needing restock

## Troubleshooting
- Connection refused: Check host/port
- SSL error: Add `?ssl-mode=required` to URL
- Access denied: Verify username/password
- Table not found: Run schema.sql first
