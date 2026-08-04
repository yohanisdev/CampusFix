const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Setup
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// Import Routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Fallback Route: Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API Health Check
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() AS current_time');
        res.status(200).json({
            status: 'OK',
            message: 'CampusFix API server and database are operational.',
            timestamp: result.rows[0].current_time
        });
    } catch (err) {
        console.error('[HEALTH CHECK ERROR]', err.message);
        res.status(500).json({ 
            status: 'ERROR', 
            message: 'Database connection failed.', 
            error: err.message 
        });
    }
});

// Start HTTP Server
app.listen(PORT, () => {
    console.log(`[SERVER] CampusFix backend running on http://localhost:${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
});