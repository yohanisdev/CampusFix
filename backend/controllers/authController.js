const db = require('../config/db');
let bcrypt;
try {
    bcrypt = require('bcrypt');
} catch (e) {
    bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');

// Register a New Student / User
const register = async (req, res) => {
    const { name, email, password, role } = req.body;

    // 1. Basic Validation
    if (!name || !email || !password) {
        return res.status(400).json({ 
            status: 'ERROR', 
            message: 'Name, email, and password are required fields.' 
        });
    }

    try {
        // 2. Check if user email already exists
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ 
                status: 'ERROR', 
                message: 'A user with this email address already exists.' 
            });
        }

        // 3. Hash Password (Salt rounds = 10)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Default role to STUDENT unless explicitly specified as ADMIN
        const userRole = (role && role.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'STUDENT';

        // 5. Insert User into PostgreSQL
        const newUserQuery = `
            INSERT INTO users (name, email, password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role, created_at
        `;
        const values = [name.trim(), email.toLowerCase().trim(), hashedPassword, userRole];
        const result = await db.query(newUserQuery, values);
        const user = result.rows[0];

        // 6. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(201).json({
            status: 'SUCCESS',
            message: 'User registered successfully.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('[AUTH REGISTER ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error during registration.' });
    }
};

// Login Existing User
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            status: 'ERROR', 
            message: 'Email and password are required.' 
        });
    }

    try {
        // 1. Query user from database
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                status: 'ERROR', 
                message: 'Invalid email or password credentials.' 
            });
        }

        const user = result.rows[0];

        // 2. Compare incoming plain password with stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                status: 'ERROR', 
                message: 'Invalid email or password credentials.' 
            });
        }

        // 3. Issue JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('[AUTH LOGIN ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error during login.' });
    }
};

// Get Current Logged-in User Profile (/api/auth/me)
const getMe = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'User account not found.' });
        }

        res.status(200).json({
            status: 'SUCCESS',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('[AUTH ME ERROR]', err);
        res.status(500).json({ status: 'ERROR', message: 'Internal server error fetching user profile.' });
    }
};

module.exports = {
    register,
    login,
    getMe
};