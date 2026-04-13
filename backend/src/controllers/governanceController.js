const pool = require('../config/db');

/**
 * GET /api/admin/system-health
 *
 * Governance & Analytics Dashboard for administrators.
 * Returns aggregated system metrics:
 *   1. Emergency Override Frequency per provider
 *   2. Consent Velocity (grants vs revokes over 30 days)
 *   3. Storage Volume (medical record count)
 *   4. Average Time-to-Care (booking → completion)
 */
const getSystemHealth = async (req, res, next) => {
    try {
        // ── 1. Emergency Override Frequency ──────────────────────
        // Flags providers who use emergency override, sorted by frequency
        const emergencyResult = await pool.query(`
            SELECT
                al.user_id AS provider_id,
                u.email AS provider_email,
                p.full_name AS provider_name,
                COUNT(*)::INTEGER AS override_count,
                MAX(al.created_at) AS last_override_at
            FROM audit_logs al
            JOIN users u ON u.id = al.user_id
            LEFT JOIN profiles p ON p.user_id = al.user_id
            WHERE al.action = 'EMERGENCY_OVERRIDE'
              AND al.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY al.user_id, u.email, p.full_name
            ORDER BY override_count DESC
            LIMIT 20
        `);

        // ── 2. Consent Velocity ─────────────────────────────────
        // Grants vs revokes in the last 30 days
        const consentVelocityResult = await pool.query(`
            SELECT
                action,
                COUNT(*)::INTEGER AS total
            FROM audit_logs
            WHERE action IN ('CONSENT_GRANT', 'CONSENT_REVOKE')
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY action
        `);

        const consentVelocity = {
            granted: 0,
            revoked: 0,
            period: '30 days',
        };
        for (const row of consentVelocityResult.rows) {
            if (row.action === 'CONSENT_GRANT') consentVelocity.granted = row.total;
            if (row.action === 'CONSENT_REVOKE') consentVelocity.revoked = row.total;
        }
        consentVelocity.netChange = consentVelocity.granted - consentVelocity.revoked;

        // ── 3. Storage Volume ───────────────────────────────────
        // Count of medical records and total files
        const storageResult = await pool.query(`
            SELECT
                COUNT(*)::INTEGER AS total_records,
                COUNT(DISTINCT patient_id)::INTEGER AS patients_with_records
            FROM medical_records
        `);
        const storage = storageResult.rows[0];

        // ── 4. Average Time-to-Care ─────────────────────────────
        // Average time between appointment creation and scheduled date
        // for completed appointments
        const timeToCareResult = await pool.query(`
            SELECT
                ROUND(AVG(EXTRACT(EPOCH FROM (date_time - created_at)) / 3600)::NUMERIC, 1)
                    AS avg_hours_to_care,
                COUNT(*)::INTEGER AS completed_appointments
            FROM appointments
            WHERE status = 'COMPLETED'
        `);
        const timeToCare = {
            averageHours: timeToCareResult.rows[0].avg_hours_to_care
                ? parseFloat(timeToCareResult.rows[0].avg_hours_to_care)
                : null,
            completedAppointments: timeToCareResult.rows[0].completed_appointments,
        };

        // ── 5. Quick system summary ─────────────────────────────
        const userCountResult = await pool.query(`
            SELECT role, COUNT(*)::INTEGER AS total
            FROM users
            GROUP BY role
        `);
        const userCounts = {};
        for (const row of userCountResult.rows) {
            userCounts[row.role] = row.total;
        }

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics: {
                emergencyOverrides: {
                    period: '30 days',
                    providers: emergencyResult.rows,
                },
                consentVelocity,
                storageVolume: storage,
                timeToCare,
                userCounts,
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getSystemHealth };
