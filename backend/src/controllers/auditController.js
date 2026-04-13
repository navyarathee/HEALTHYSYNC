const pool = require('../config/db');

/**
 * GET /api/admin/audit-logs
 * Admin views system-wide access patterns.
 * Query params: page, limit, action, userId
 */
const getAuditLogs = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params = [];
        const conditions = [];

        if (req.query.action) {
            params.push(req.query.action.toUpperCase());
            conditions.push(`a.action = $${params.length}`);
        }

        if (req.query.userId) {
            params.push(req.query.userId);
            conditions.push(`a.user_id = $${params.length}`);
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Count total
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM audit_logs a ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Fetch page
        params.push(limit, offset);
        const { rows } = await pool.query(
            `SELECT a.*, u.email AS user_email,
                    p.full_name AS accessor_name, p.hospital_name AS accessor_hospital,
                    p.specialization AS accessor_specialization
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN profiles p ON p.user_id = a.user_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        res.json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            logs: rows,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/profile/my-logs
 * Patient views who accessed their data.
 * Query params: page, limit
 */
const getMyLogs = async (req, res, next) => {
    try {
        const patientId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM audit_logs WHERE resource_id = $1`,
            [patientId]
        );
        const total = parseInt(countResult.rows[0].count);

        const { rows } = await pool.query(
            `SELECT a.*, u.email AS accessor_email,
                    p.full_name AS accessor_name, p.hospital_name AS accessor_hospital,
                    p.specialization AS accessor_specialization
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN profiles p ON p.user_id = a.user_id
       WHERE a.resource_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
            [patientId, limit, offset]
        );

        res.json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            logs: rows,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAuditLogs, getMyLogs };
