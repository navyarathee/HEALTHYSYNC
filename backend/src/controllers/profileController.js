const pool = require('../config/db');

/**
 * GET /api/profile
 * Fetch the authenticated user's own profile (Patient or Provider).
 */
const getProfile = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT p.*, u.email, u.role
             FROM profiles p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id = $1`,
            [req.user.id]
        );

        if (rows.length === 0) {
            // Auto-create an empty profile if none exists
            const insert = await pool.query(
                `INSERT INTO profiles (user_id) VALUES ($1) RETURNING *`,
                [req.user.id]
            );
            return res.json({
                success: true,
                profile: { ...insert.rows[0], email: req.user.email, role: req.user.role },
            });
        }

        res.json({ success: true, profile: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/profile
 * Update (upsert) the authenticated user's profile.
 * Handles both patient and provider fields.
 */
const updateProfile = async (req, res, next) => {
    try {
        const {
            // Common
            fullName,
            dateOfBirth,
            // Patient fields
            bloodGroup,
            allergies,
            chronicConditions,
            emergencyContact,
            gender,
            phone,
            address,
            // Provider fields
            title,
            specialization,
            hospitalName,
            department,
            workPhone,
            workEmail,
            clinicAddress,
            licenseNumber,
        } = req.body;

        const { rows } = await pool.query(
            `INSERT INTO profiles (
                user_id, full_name, date_of_birth, blood_group,
                allergies, chronic_conditions, emergency_contact,
                gender, phone, address,
                title, specialization, hospital_name, department,
                work_phone, work_email, clinic_address, license_number,
                updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
                full_name          = COALESCE($2,  profiles.full_name),
                date_of_birth      = COALESCE($3,  profiles.date_of_birth),
                blood_group        = COALESCE($4,  profiles.blood_group),
                allergies          = COALESCE($5,  profiles.allergies),
                chronic_conditions = COALESCE($6,  profiles.chronic_conditions),
                emergency_contact  = COALESCE($7,  profiles.emergency_contact),
                gender             = COALESCE($8,  profiles.gender),
                phone              = COALESCE($9,  profiles.phone),
                address            = COALESCE($10, profiles.address),
                title              = COALESCE($11, profiles.title),
                specialization     = COALESCE($12, profiles.specialization),
                hospital_name      = COALESCE($13, profiles.hospital_name),
                department         = COALESCE($14, profiles.department),
                work_phone         = COALESCE($15, profiles.work_phone),
                work_email         = COALESCE($16, profiles.work_email),
                clinic_address     = COALESCE($17, profiles.clinic_address),
                license_number     = COALESCE($18, profiles.license_number),
                updated_at         = NOW()
             RETURNING *`,
            [
                req.user.id,
                fullName || null,
                dateOfBirth || null,
                bloodGroup || null,
                allergies || null,
                chronicConditions || null,
                emergencyContact || null,
                gender || null,
                phone || null,
                address || null,
                title || null,
                specialization || null,
                hospitalName || null,
                department || null,
                workPhone || null,
                workEmail || null,
                clinicAddress || null,
                licenseNumber || null,
            ]
        );

        res.json({ success: true, profile: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/profile/export
 * Patient downloads all their data as a single JSON object (GDPR-style export).
 */
const exportData = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const profileResult = await pool.query(
            `SELECT * FROM profiles WHERE user_id = $1`, [userId]
        );

        const recordsResult = await pool.query(
            `SELECT id, title, category, file_url, is_archived, tags, created_at
             FROM medical_records WHERE patient_id = $1
             ORDER BY created_at DESC`, [userId]
        );

        const consentsResult = await pool.query(
            `SELECT c.id, c.provider_id, u.email AS provider_email,
                    c.access_level, c.category, c.status, c.expires_at, c.created_at
             FROM consents c
             JOIN users u ON u.id = c.provider_id
             WHERE c.patient_id = $1
             ORDER BY c.created_at DESC`, [userId]
        );

        const appointmentsResult = await pool.query(
            `SELECT id, provider_id, date_time, status, type, notes, created_at
             FROM appointments WHERE patient_id = $1
             ORDER BY date_time DESC`, [userId]
        );

        const auditResult = await pool.query(
            `SELECT id, action, resource_type, access_reason, ip_address, created_at
             FROM audit_logs
             WHERE user_id = $1 OR resource_id = $1
             ORDER BY created_at DESC
             LIMIT 500`, [userId]
        );

        const exportPayload = {
            exportedAt: new Date().toISOString(),
            user: { id: userId, email: req.user.email, role: req.user.role },
            profile: profileResult.rows[0] || null,
            medicalRecords: recordsResult.rows,
            consents: consentsResult.rows,
            appointments: appointmentsResult.rows,
            auditLogs: auditResult.rows,
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="healthsync-export-${Date.now()}.json"`);
        res.json(exportPayload);
    } catch (err) {
        next(err);
    }
};

module.exports = { getProfile, updateProfile, exportData };
