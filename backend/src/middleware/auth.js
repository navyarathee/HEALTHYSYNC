const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * authenticate – verifies JWT from Authorization header or cookie.
 * Attaches the decoded user to req.user.
 */
const authenticate = async (req, res, next) => {
    try {
        let token = null;

        // 1. Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // 2. Fall back to cookie
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // 3. Fall back to query param (for iframes/images/downloads)
        if (!token && req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch fresh user data from DB (including suspension status)
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.role, u.is_2fa_enabled, u.created_at,
                    COALESCE(p.is_suspended, FALSE) AS is_suspended,
                    p.verification_status
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.id = $1`,
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        const user = rows[0];

        // Block suspended users immediately
        if (user.is_suspended) {
            return res.status(403).json({ message: 'Account suspended. Contact administrator.' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        next(err);
    }
};

/**
 * authorize – RBAC middleware.
 * @param {string[]} roles – array of roles allowed to access the route
 */
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
