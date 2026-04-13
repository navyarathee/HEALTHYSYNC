const pool = require('../config/db');

/**
 * logAccess – Audit logger middleware factory.
 *
 * @param {string} action – one of the audit_action enum values
 * @returns Express middleware
 *
 * For PROVIDER role on RECORD_VIEW actions, requires the x-access-reason header.
 * After the response completes, inserts an immutable audit log entry.
 */
const logAccess = (action) => {
    return async (req, res, next) => {
        try {
            const { role, id: userId } = req.user;

            // ── Require access reason for providers viewing records ───
            const REASON_REQUIRED_ACTIONS = ['RECORD_VIEW', 'COLLAB_NOTE_VIEW'];
            const validReasons = ['TREATMENT', 'EMERGENCY', 'BILLING', 'RESEARCH', 'CONSULTATION', 'FOLLOW_UP', 'OTHER'];

            let accessReason = null;

            if (role === 'PROVIDER' && REASON_REQUIRED_ACTIONS.includes(action)) {
                const reasonHeader = req.headers['x-access-reason'];

                if (!reasonHeader) {
                    return res.status(400).json({
                        message: 'x-access-reason header is required for provider access',
                        validReasons,
                    });
                }

                const normalised = reasonHeader.toUpperCase();
                if (!validReasons.includes(normalised)) {
                    return res.status(400).json({
                        message: `Invalid access reason. Must be one of: ${validReasons.join(', ')}`,
                    });
                }

                accessReason = normalised;
            }

            // ── Determine resource info ──────────────────────────────
            const resourceId = req.params.patientId || req.params.id || null;
            const resourceType = action.includes('RECORD')
                ? 'medical_record'
                : action.includes('CONSENT')
                    ? 'consent'
                    : action.includes('PROFILE')
                        ? 'profile'
                        : 'system';

            // ── Get IP address ───────────────────────────────────────
            const ipAddress =
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.socket?.remoteAddress ||
                'unknown';

            // ── Log after response completes ─────────────────────────
            res.on('finish', async () => {
                try {
                    // Only log successful operations (2xx status codes)
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        await pool.query(
                            `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, access_reason, ip_address, details)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [
                                userId,
                                action,
                                resourceId,
                                resourceType,
                                accessReason,
                                ipAddress,
                                JSON.stringify({
                                    method: req.method,
                                    path: req.originalUrl,
                                    statusCode: res.statusCode,
                                    ...(req.emergencyOverride && { severity: 'CRITICAL', emergencyOverride: true }),
                                }),
                            ]
                        );
                    }
                } catch (err) {
                    // Audit logging failure should not break the app – just log it
                    console.error('⚠️  Audit log write failed:', err.message);
                }
            });

            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = { logAccess };
