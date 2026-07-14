require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'retail_pos',
    port: parseInt(process.env.DB_PORT) || 3306,
    connectionLimit: 10
  },
  jwtSecret: process.env.JWT_SECRET || 'super_secret_pos_key'
};
