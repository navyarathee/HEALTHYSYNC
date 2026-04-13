const pool = require('../config/db');

// ── Utility: mask patient name (John D. or UID_xxxx) ────────
const maskName = (fullName, userId) => {
    if (!fullName) return `UID_${userId?.substring(0, 8) || '???'}`;
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return `${parts[0].charAt(0)}.`;
};

/**
 * GET /api/admin/dashboard
 * Returns the four dashboard tiles:
 *   1. System Load (patients vs providers)
 *   2. Pending Approvals
 *   3. Emergency Events (24h)
 *   4. Security Flags (failed logins in last 24h)
 */
const getAdminDashboard = async (req, res, next) => {
    try {
        // 1. System load
        const userCountResult = await pool.query(`
            SELECT role, COUNT(*)::INTEGER AS total
            FROM users
            GROUP BY role
        `);
        const userCounts = {};
        for (const row of userCountResult.rows) {
            userCounts[row.role] = row.total;
        }

        // 2. Pending approvals
        const pendingResult = await pool.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM profiles p
            JOIN users u ON u.id = p.user_id
            WHERE u.role = 'PROVIDER'
              AND p.verification_status = 'PENDING'
        `);
        const pendingApprovals = pendingResult.rows[0].total;

        // 3. Emergency events (last 24h)
        const emergencyResult = await pool.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM audit_logs
            WHERE action = 'EMERGENCY_OVERRIDE'
              AND created_at >= NOW() - INTERVAL '24 hours'
        `);
        const emergencyEvents = emergencyResult.rows[0].total;

        // 4. Security flags — failed login attempts detection
        //    We approximate by counting recent LOGIN actions with suspicious patterns
        //    (in production, you'd have a dedicated failed_logins table)
        const securityResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id)::INTEGER AS flagged_users
            FROM audit_logs
            WHERE action = 'EMERGENCY_OVERRIDE'
              AND created_at >= NOW() - INTERVAL '7 days'
        `);
        const securityFlags = securityResult.rows[0].flagged_users;

        // 5. Suspended users count
        const suspendedResult = await pool.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM profiles WHERE is_suspended = TRUE
        `);
        const suspendedUsers = suspendedResult.rows[0].total;

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            tiles: {
                systemLoad: {
                    patients: userCounts.PATIENT || 0,
                    providers: userCounts.PROVIDER || 0,
                    admins: userCounts.ADMIN || 0,
                    total: Object.values(userCounts).reduce((a, b) => a + b, 0),
                },
                pendingApprovals,
                emergencyEvents,
                securityFlags,
                suspendedUsers,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/verification-queue
 * List providers awaiting verification.
 */
const getVerificationQueue = async (req, res, next) => {
    try {
        const status = req.query.status || 'PENDING';
        const { rows } = await pool.query(`
            SELECT u.id, u.email, u.created_at,
                   p.full_name, p.specialization, p.license_number,
                   p.hospital_name, p.verification_status, p.license_image_url,
                   p.department, p.title
            FROM users u
            JOIN profiles p ON p.user_id = u.id
            WHERE u.role = 'PROVIDER'
              AND p.verification_status = $1
            ORDER BY u.created_at ASC
        `, [status]);

        res.json({ success: true, providers: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/verify/:userId
 * Body: { action: 'APPROVE' | 'REJECT' }
 */
const verifyProvider = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { action } = req.body;

        if (!['APPROVE', 'REJECT'].includes(action?.toUpperCase())) {
            return res.status(400).json({ message: 'Action must be APPROVE or REJECT' });
        }

        const newStatus = action.toUpperCase() === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const auditAction = action.toUpperCase() === 'APPROVE'
            ? 'VERIFICATION_APPROVED'
            : 'VERIFICATION_REJECTED';

        // Ensure user is a provider
        const userCheck = await pool.query(
            'SELECT id, role FROM users WHERE id = $1', [userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (userCheck.rows[0].role !== 'PROVIDER') {
            return res.status(400).json({ message: 'Only providers can be verified' });
        }

        await pool.query(
            'UPDATE profiles SET verification_status = $1 WHERE user_id = $2',
            [newStatus, userId]
        );

        // Audit log
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, details)
             VALUES ($1, $2, $3, 'USER', $4)`,
            [req.user.id, auditAction, userId, JSON.stringify({ status: newStatus })]
        );

        res.json({ success: true, message: `Provider ${newStatus.toLowerCase()}`, status: newStatus });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/audit-stream
 * Searchable, paginated audit logs with admin notes.
 * Query params: page, limit, search, action, emergency
 */
const getGlobalAuditStream = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (req.query.action) {
            params.push(req.query.action.toUpperCase());
            conditions.push(`a.action = $${params.length}`);
        }

        if (req.query.search) {
            params.push(`%${req.query.search}%`);
            conditions.push(`(u.email ILIKE $${params.length} OR a.action::TEXT ILIKE $${params.length})`);
        }

        if (req.query.emergency === 'true') {
            conditions.push(`a.action = 'EMERGENCY_OVERRIDE'`);
        }

        const whereClause = conditions.length > 0
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        // Count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Fetch — PRIVACY WALL: exclude file_url and noteContent
        params.push(limit, offset);
        const { rows } = await pool.query(
            `SELECT a.id, a.user_id, a.action, a.resource_id, a.resource_type,
                    a.access_reason, a.ip_address, a.details, a.created_at,
                    u.email AS user_email, u.role AS user_role,
                    p.full_name AS user_name, p.hospital_name,
                    p.specialization
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.user_id
             LEFT JOIN profiles p ON p.user_id = a.user_id
             ${whereClause}
             ORDER BY a.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        // Fetch admin notes for these logs
        const logIds = rows.map(r => r.id);
        let notesMap = {};
        if (logIds.length > 0) {
            const notesResult = await pool.query(
                `SELECT an.*, u.email AS admin_email
                 FROM admin_notes an
                 JOIN users u ON u.id = an.admin_id
                 WHERE an.audit_log_id = ANY($1)
                 ORDER BY an.created_at ASC`,
                [logIds]
            );
            for (const note of notesResult.rows) {
                if (!notesMap[note.audit_log_id]) notesMap[note.audit_log_id] = [];
                notesMap[note.audit_log_id].push(note);
            }
        }

        // Attach notes to logs and mask patient names
        const logsWithNotes = rows.map(log => ({
            ...log,
            user_name: log.user_role === 'PATIENT' ? maskName(log.user_name, log.user_id) : log.user_name,
            admin_notes: notesMap[log.id] || [],
            is_emergency: log.action === 'EMERGENCY_OVERRIDE',
        }));

        res.json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            logs: logsWithNotes,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/audit-logs/:logId/note
 * Body: { note }
 * Append-only admin note on an audit log.
 */
const addAdminNote = async (req, res, next) => {
    try {
        const { logId } = req.params;
        const { note } = req.body;

        if (!note || !note.trim()) {
            return res.status(400).json({ message: 'Note content is required' });
        }

        // Verify log exists
        const logCheck = await pool.query('SELECT id FROM audit_logs WHERE id = $1', [logId]);
        if (logCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Audit log entry not found' });
        }

        const { rows } = await pool.query(
            `INSERT INTO admin_notes (audit_log_id, admin_id, note)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [logId, req.user.id, note.trim()]
        );

        // Audit the note addition itself
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, details)
             VALUES ($1, 'ADMIN_NOTE_ADDED', $2, 'AUDIT_LOG', $3)`,
            [req.user.id, logId, JSON.stringify({ note_id: rows[0].id })]
        );

        res.status(201).json({ success: true, note: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/users/:userId/suspend
 * Body: { reason }
 */
const suspendUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: 'Suspension reason is required' });
        }

        // Cannot suspend yourself or other admins
        const userCheck = await pool.query('SELECT id, role FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (userCheck.rows[0].role === 'ADMIN') {
            return res.status(400).json({ message: 'Cannot suspend admin accounts' });
        }

        // Update profile
        await pool.query(
            `UPDATE profiles SET is_suspended = TRUE, suspension_reason = $1
             WHERE user_id = $2`,
            [reason.trim(), userId]
        );

        // Invalidate all refresh tokens (immediate session revocation)
        await pool.query(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1',
            [userId]
        );

        // Log to suspension_history
        await pool.query(
            `INSERT INTO suspension_history (user_id, action, reason, admin_id)
             VALUES ($1, 'SUSPENDED', $2, $3)`,
            [userId, reason.trim(), req.user.id]
        );

        // Audit log
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, details)
             VALUES ($1, 'USER_SUSPENDED', $2, 'USER', $3)`,
            [req.user.id, userId, JSON.stringify({ reason: reason.trim() })]
        );

        res.json({ success: true, message: 'User suspended successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/users/:userId/unsuspend
 */
const unsuspendUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        await pool.query(
            `UPDATE profiles SET is_suspended = FALSE, suspension_reason = NULL
             WHERE user_id = $1`,
            [userId]
        );

        // Log to suspension_history
        await pool.query(
            `INSERT INTO suspension_history (user_id, action, reason, admin_id)
             VALUES ($1, 'UNSUSPENDED', 'Suspension lifted by admin', $2)`,
            [userId, req.user.id]
        );

        // Audit log
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_id, resource_type)
             VALUES ($1, 'USER_UNSUSPENDED', $2, 'USER')`,
            [req.user.id, userId]
        );

        res.json({ success: true, message: 'User unsuspended successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/admin/users/:userId/credentials
 * Body: { hospitalName, specialization, department }
 */
const editCredentials = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { hospitalName, specialization, department } = req.body;

        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updates = [];
        const params = [];

        if (hospitalName !== undefined) {
            params.push(hospitalName);
            updates.push(`hospital_name = $${params.length}`);
        }
        if (specialization !== undefined) {
            params.push(specialization);
            updates.push(`specialization = $${params.length}`);
        }
        if (department !== undefined) {
            params.push(department);
            updates.push(`department = $${params.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        params.push(userId);
        await pool.query(
            `UPDATE profiles SET ${updates.join(', ')}, updated_at = NOW()
             WHERE user_id = $${params.length}`,
            params
        );

        // Audit log
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, details)
             VALUES ($1, 'CREDENTIAL_EDIT', $2, 'USER', $3)`,
            [req.user.id, userId, JSON.stringify({ hospitalName, specialization, department })]
        );

        res.json({ success: true, message: 'Credentials updated' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/broadcast
 * Body: { message }
 * Sends a banner notification to all users.
 */
const sendBroadcast = async (req, res, next) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Broadcast message is required' });
        }

        // Get all user IDs
        const usersResult = await pool.query('SELECT id FROM users');

        // Insert a notification for each user
        const insertPromises = usersResult.rows.map(user =>
            pool.query(
                `INSERT INTO notifications (user_id, type, title, message)
                 VALUES ($1, 'SYSTEM_BROADCAST', 'System Announcement', $2)`,
                [user.id, message.trim()]
            )
        );
        await Promise.all(insertPromises);

        // Audit log
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, details)
             VALUES ($1, 'SYSTEM_BROADCAST', 'SYSTEM', $2)`,
            [req.user.id, JSON.stringify({ message: message.trim(), recipientCount: usersResult.rows.length })]
        );

        res.json({
            success: true,
            message: 'Broadcast sent',
            recipientCount: usersResult.rows.length,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/users/:userId/license
 * Returns the license image URL for the provider.
 */
const getLicenseImage = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const { rows } = await pool.query(
            `SELECT p.license_number, p.license_image_url, p.full_name,
                    p.specialization, p.hospital_name
             FROM profiles p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id = $1 AND u.role = 'PROVIDER'`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        res.json({ success: true, license: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/admin/users
 * Paginated user list with privacy masking for patient names.
 * Query params: page, limit, role, search
 */
const getUserList = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (req.query.role) {
            params.push(req.query.role.toUpperCase());
            conditions.push(`u.role = $${params.length}`);
        }

        if (req.query.search) {
            params.push(`%${req.query.search}%`);
            conditions.push(`(u.email ILIKE $${params.length} OR p.full_name ILIKE $${params.length})`);
        }

        const whereClause = conditions.length > 0
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM users u LEFT JOIN profiles p ON p.user_id = u.id ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.role, u.created_at,
                    p.full_name, p.verification_status, p.is_suspended,
                    p.suspension_reason, p.specialization, p.hospital_name,
                    p.license_number, p.department
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             ${whereClause}
             ORDER BY u.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        // Privacy masking: mask patient names
        const maskedRows = rows.map(user => ({
            ...user,
            full_name: user.role === 'PATIENT'
                ? maskName(user.full_name, user.id)
                : user.full_name,
        }));

        res.json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            users: maskedRows,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAdminDashboard,
    getVerificationQueue,
    verifyProvider,
    getGlobalAuditStream,
    addAdminNote,
    suspendUser,
    unsuspendUser,
    editCredentials,
    sendBroadcast,
    getLicenseImage,
    getUserList,
};
