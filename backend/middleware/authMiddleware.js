const jwt = require('jsonwebtoken');

// Verify JWT Token Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Extract token from format: "Bearer <TOKEN>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            status: 'ERROR', 
            message: 'Access denied. No authentication token provided.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user payload (id, email, role) to request object
        next(); // Proceed to next middleware or route controller
    } catch (err) {
        return res.status(403).json({ 
            status: 'ERROR', 
            message: 'Invalid or expired token.' 
        });
    }
};

// Require Administrator Role Middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ 
            status: 'ERROR', 
            message: 'Access denied. Administrator privileges required.' 
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin
};