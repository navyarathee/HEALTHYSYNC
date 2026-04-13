const pool = require('../config/db');

/**
 * POST /api/collab/notes
 * Provider adds a shared note to a patient's case discussion thread.
 * Body: { patientId, content, visibility? }
 */
const createCollabNote = async (req, res, next) => {
    try {
        const authorId = req.user.id;
        const { patientId, content, visibility } = req.body;

        if (!patientId || !content) {
            return res.status(400).json({ message: 'patientId and content are required' });
        }

        const validVisibilities = ['INTERNAL', 'SHARED_WITH_PATIENT'];
        const vis = visibility && validVisibilities.includes(visibility.toUpperCase())
            ? visibility.toUpperCase()
            : 'INTERNAL';

        const { rows } = await pool.query(
            `INSERT INTO collaboration_notes (patient_id, author_id, content, visibility)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [patientId, authorId, content, vis]
        );

        res.status(201).json({ success: true, note: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/collab/notes/:patientId
 * Fetch the case discussion thread for a patient.
 * - Providers see ALL notes (Internal + Shared with Patient)
 * - Patients see only SHARED_WITH_PATIENT notes
 * Query params: page, limit
 */
const getCollabNotes = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;

        let visibilityFilter = '';
        const params = [patientId];

        // Patients can only see notes shared with them
        if (req.user.role === 'PATIENT') {
            visibilityFilter = `AND cn.visibility = 'SHARED_WITH_PATIENT'`;
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM collaboration_notes cn
             WHERE cn.patient_id = $1 ${visibilityFilter}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const { rows } = await pool.query(
            `SELECT cn.*, p.full_name AS author_name
             FROM collaboration_notes cn
             LEFT JOIN profiles p ON p.user_id = cn.author_id
             WHERE cn.patient_id = $1 ${visibilityFilter}
             ORDER BY cn.created_at DESC
             LIMIT $2 OFFSET $3`,
            params
        );

        // PRIVACY WALL: Admins can see metadata but not clinical content
        const sanitizedRows = req.user.role === 'ADMIN'
            ? rows.map(({ content, ...rest }) => ({ ...rest, content: '[PRIVATE CLINICAL CONTENT]' }))
            : rows;

        res.json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            notes: sanitizedRows,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { createCollabNote, getCollabNotes };
