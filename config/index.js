const crypto = require('node:crypto');

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  database: process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/loginapp',
  // Development fallback: a random secret per start (everyone is logged out on restart).
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
};
