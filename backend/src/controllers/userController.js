const pool = require('../config/db');

/**
 * GET /api/users/me
 * Returns the current authenticated user's info.
 */
const getMe = async (req, res, _next) => {
    // req.user is set by the authenticate middleware
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            is2FAEnabled: req.user.is_2fa_enabled,
            createdAt: req.user.created_at,
        },
    });
};

/**
 * GET /api/users/providers
 * Returns a list of all provider users (id + email).
 */
const getProviders = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, email FROM users WHERE role = 'PROVIDER' ORDER BY email ASC"
        );
        res.json({ success: true, providers: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/users/patients
 * Returns a list of all patient users (id + email).
 */
const getPatients = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, email FROM users WHERE role = 'PATIENT' ORDER BY email ASC"
        );
        res.json({ success: true, patients: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMe, getProviders, getPatients };
