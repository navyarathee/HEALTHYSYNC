const pool = require('../config/db');

/**
 * GET /api/providers/search?q=<query>
 * Search for providers by name or email.
 * Available to PATIENT role for discovering providers.
 */
const searchProviders = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                message: 'Search query must be at least 2 characters',
            });
        }

        const searchTerm = `%${q.trim().toLowerCase()}%`;

        const { rows } = await pool.query(
            `SELECT u.id, u.email,
                    p.full_name, p.title, p.specialization,
                    p.hospital_name, p.department, p.clinic_address
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.role = 'PROVIDER'
               AND (
                 LOWER(u.email) LIKE $1
                 OR LOWER(COALESCE(p.full_name, '')) LIKE $1
                 OR LOWER(COALESCE(p.specialization, '')) LIKE $1
                 OR LOWER(COALESCE(p.hospital_name, '')) LIKE $1
               )
             ORDER BY p.full_name ASC, u.email ASC
             LIMIT 20`,
            [searchTerm]
        );

        res.json({
            success: true,
            count: rows.length,
            providers: rows,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { searchProviders };
