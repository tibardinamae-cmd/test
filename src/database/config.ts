// ============================================
// AIVEN DATABASE CONFIGURATION
// ============================================
// Replace these values with your Aiven credentials
// ============================================

export const dbConfig = {
  // Aiven MySQL Connection
  host: process.env.AIVEN_DB_HOST || 'your-aiven-host.aivencloud.com',
  port: parseInt(process.env.AIVEN_DB_PORT || '25060'),
  database: process.env.AIVEN_DB_NAME || 'takoyaki_house',
  user: process.env.AIVEN_DB_USER || 'avnadmin',
  password: process.env.AIVEN_DB_PASSWORD || 'your-password',
  
  // SSL Configuration (required for Aiven)
  ssl: {
    rejectUnauthorized: true,
  },
  
  // Connection Pool Settings
  connectionLimit: 10,
  queueLimit: 0,
};

// ============================================
// AIVEN CONNECTION STRING FORMAT
// ============================================
// mysql://avnadmin:PASSWORD@HOST:PORT/DATABASE_NAME?ssl-mode=required
//
// Example:
// mysql://avnadmin:mypassword@my-db-username-abc123.aivencloud.com:25060/defaultdb?ssl-mode=required
// ============================================

export const AIVEN_CONNECTION_STRING = process.env.AIVEN_DATABASE_URL || 
  `mysql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?ssl-mode=required`;

// ============================================
// FOR PRODUCTION - Use environment variables
// ============================================
// Create a .env file with:
// AIVEN_DB_HOST=your-host.aivencloud.com
// AIVEN_DB_PORT=25060
// AIVEN_DB_NAME=takoyaki_house
// AIVEN_DB_USER=avnadmin
// AIVEN_DB_PASSWORD=your-password
// AIVEN_DATABASE_URL=mysql://avnadmin:password@host:port/dbname?ssl-mode=required
