const pool = require('../config/db');

/**
 * POST /api/consent/grant
 * Patient grants a provider access to their records.
 * Body: { providerId, accessLevel, category?, expiresInDays? }
 */
const grantConsent = async (req, res, next) => {
    try {
        const patientId = req.user.id;
        const { providerId, accessLevel, category, expiresInDays } = req.body;

        // ── Validation ─────────────────────────────────────────
        if (!providerId) {
            return res.status(400).json({ message: 'providerId is required' });
        }

        // Ensure the provider exists and is actually a PROVIDER
        const providerCheck = await pool.query(
            "SELECT id, role FROM users WHERE id = $1 AND role = 'PROVIDER'",
            [providerId]
        );
        if (providerCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        const validAccessLevels = ['ALL_RECORDS', 'SPECIFIC_CATEGORY'];
        const level = accessLevel && validAccessLevels.includes(accessLevel.toUpperCase())
            ? accessLevel.toUpperCase()
            : 'ALL_RECORDS';

        if (level === 'SPECIFIC_CATEGORY' && !category) {
            return res.status(400).json({
                message: 'category is required when accessLevel is SPECIFIC_CATEGORY',
            });
        }

        // Calculate expiry
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        // ── Upsert consent (reactivate if previously revoked) ──
        const { rows } = await pool.query(
            `INSERT INTO consents (patient_id, provider_id, access_level, category, status, expires_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
       ON CONFLICT (patient_id, provider_id)
       DO UPDATE SET
         access_level = $3,
         category     = $4,
         status       = 'ACTIVE',
         expires_at   = $5,
         created_at   = NOW()
       RETURNING *`,
            [patientId, providerId, level, category ? category.toUpperCase() : null, expiresAt]
        );

        res.status(201).json({ success: true, consent: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/consent/revoke/:id
 * Patient immediately revokes a consent by ID.
 */
const revokeConsent = async (req, res, next) => {
    try {
        const consentId = req.params.id;
        const patientId = req.user.id;

        const { rows } = await pool.query(
            `UPDATE consents
       SET status = 'REVOKED'
       WHERE id = $1 AND patient_id = $2 AND status = 'ACTIVE'
       RETURNING *`,
            [consentId, patientId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Active consent not found or you are not the owner',
            });
        }

        res.json({ success: true, message: 'Consent revoked', consent: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/consent/active
 * Patient lists all providers who currently have active access.
 */
const getActiveConsents = async (req, res, next) => {
    try {
        const patientId = req.user.id;

        const { rows } = await pool.query(
            `SELECT c.*, u.email AS provider_email
       FROM consents c
       JOIN users u ON u.id = c.provider_id
       WHERE c.patient_id = $1
         AND c.status = 'ACTIVE'
         AND (c.expires_at IS NULL OR c.expires_at > NOW())
       ORDER BY c.created_at DESC`,
            [patientId]
        );

        res.json({ success: true, count: rows.length, consents: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { grantConsent, revokeConsent, getActiveConsents };
