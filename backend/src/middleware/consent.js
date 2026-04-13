const pool = require('../config/db');

/**
 * verifyConsent – Consent Engine middleware.
 *
 * Intercepts requests that include a :patientId param and enforces:
 *   1. PATIENT can only access their own data (self-access)
 *   2. PROVIDER must have an ACTIVE, non-expired consent from the patient
 *   3. ADMIN passes through
 *   4. Everyone else → 403
 */
const verifyConsent = async (req, res, next) => {
    try {
        const patientId = req.params.patientId;

        if (!patientId) {
            return res.status(400).json({ message: 'Patient ID is required' });
        }

        const { role, id: userId } = req.user;

        // 1. Self-access: patient viewing their own data
        if (role === 'PATIENT') {
            if (userId === patientId) {
                return next();
            }
            return res.status(403).json({ message: 'You can only access your own data' });
        }

        // 2. Admin: unrestricted access
        if (role === 'ADMIN') {
            return next();
        }

        // 3. Provider: must have active, non-expired consent
        if (role === 'PROVIDER') {
            const { rows } = await pool.query(
                `SELECT id FROM consents
         WHERE patient_id = $1
           AND provider_id = $2
           AND status = 'ACTIVE'
           AND (expires_at IS NULL OR expires_at > NOW())`,
                [patientId, userId]
            );

            if (rows.length > 0) {
                // Store consent info for downstream use (e.g., audit logging)
                req.consent = rows[0];
                return next();
            }

            // ── Emergency Override ──────────────────────────────────
            const emergencyHeader = req.headers['x-emergency-access'];
            if (emergencyHeader === 'true') {
                // Flag for downstream audit logger
                req.emergencyOverride = true;

                // Immediately log a CRITICAL audit entry
                const ipAddress =
                    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    req.socket?.remoteAddress ||
                    'unknown';

                await pool.query(
                    `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, ip_address, details)
                     VALUES ($1, 'EMERGENCY_OVERRIDE', $2, 'medical_record', $3, $4)`,
                    [
                        userId,
                        patientId,
                        ipAddress,
                        JSON.stringify({
                            severity: 'CRITICAL',
                            note: 'Emergency override — provider accessed patient data without active consent',
                            method: req.method,
                            path: req.originalUrl,
                        }),
                    ]
                );

                return next();
            }

            return res.status(403).json({
                message: 'No active consent found. Request access from the patient.',
            });
        }

        // 4. Unknown role — deny
        return res.status(403).json({ message: 'Access denied' });
    } catch (err) {
        next(err);
    }
};

module.exports = { verifyConsent };
