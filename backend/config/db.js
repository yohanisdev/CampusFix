const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config();

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'campusfix_db',
    user: process.env.DB_USER || 'campusfix_user',
    password: String(process.env.DB_PASSWORD || ''),
});

// Log event on initial connection
pool.on('connect', () => {
    console.log('[DATABASE] Connected successfully to PostgreSQL database:', process.env.DB_NAME);
});

// Log error if client disconnects unexpectedly
pool.on('error', (err) => {
    console.error('[DATABASE ERROR] Unexpected pool client error:', err.message);
    process.exit(-1);
});

// Helper query method
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};