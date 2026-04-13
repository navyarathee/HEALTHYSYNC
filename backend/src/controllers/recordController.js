const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * POST /api/records
 * Upload a new medical record (file handled by Multer middleware).
 * Body (multipart): title, category
 * File field: "file"
 */
const uploadRecord = async (req, res, next) => {
    try {
        const { title, category } = req.body;

        if (!title || !category) {
            return res.status(400).json({ message: 'Title and category are required' });
        }

        const validCategories = ['PRESCRIPTION', 'LAB_RESULT', 'VISIT_NOTE'];
        if (!validCategories.includes(category.toUpperCase())) {
            return res.status(400).json({
                message: `Category must be one of: ${validCategories.join(', ')}`,
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'File is required' });
        }

        // Build a relative URL path that clients can use
        const fileUrl = `/uploads/${req.file.filename}`;

        const { rows } = await pool.query(
            `INSERT INTO medical_records (patient_id, title, category, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [req.user.id, title, category.toUpperCase(), fileUrl, req.user.id]
        );

        res.status(201).json({ success: true, record: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/records
 * Fetch medical records for the authenticated user.
 * Patients see their own records; Providers/Admins see all.
 */
const getRecords = async (req, res, next) => {
    try {
        const includeArchived = req.query.includeArchived === 'true';
        let query;
        let params;

        if (req.user.role === 'PATIENT') {
            query = `
                SELECT m.*, u.email as patient_name 
                FROM medical_records m
                LEFT JOIN users u ON m.patient_id = u.id
                WHERE m.patient_id = $1${includeArchived ? '' : ' AND (m.is_archived = FALSE OR m.is_archived IS NULL)'} 
                ORDER BY m.created_at DESC`;
            params = [req.user.id];
        } else {
            // PROVIDER or ADMIN can see all records
            query = `
                SELECT m.*, u.email as patient_name 
                FROM medical_records m
                LEFT JOIN users u ON m.patient_id = u.id
                ${includeArchived ? '' : 'WHERE (m.is_archived = FALSE OR m.is_archived IS NULL)'} 
                ORDER BY m.created_at DESC`;
            params = [];
        }

        const { rows } = await pool.query(query, params);

        // PRIVACY WALL: Exclude fileUrl from Admin views
        const sanitizedRows = req.user.role === 'ADMIN'
            ? rows.map(({ file_url, ...rest }) => ({ ...rest, file_url: '[PROTECTED]' }))
            : rows;

        res.json({ success: true, count: rows.length, records: sanitizedRows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/records/:patientId
 * Fetch medical records for a specific patient.
 * Gated by: authenticate → authorize → verifyConsent → logAccess
 */
const getPatientRecords = async (req, res, next) => {
    try {
        const { patientId } = req.params;

        const { rows } = await pool.query(
            `SELECT * FROM medical_records
             WHERE patient_id = $1
             ORDER BY created_at DESC`,
            [patientId]
        );

        // PRIVACY WALL: Exclude fileUrl from Admin views
        const sanitizedRows = req.user.role === 'ADMIN'
            ? rows.map(({ file_url, ...rest }) => ({ ...rest, file_url: '[PROTECTED]' }))
            : rows;

        res.json({ success: true, count: rows.length, records: sanitizedRows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/records/:id/stream
 * Stream a medical record file directly to the client (secure previewer).
 * No direct file URL is exposed; the backend proxies the file bytes.
 */
const streamRecord = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `SELECT * FROM medical_records WHERE id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        const record = rows[0];

        // PRIVACY WALL: Admins cannot stream clinical files
        if (req.user.role === 'ADMIN') {
            return res.status(403).json({ message: 'Privacy policy: Administrators cannot view clinical documents.' });
        }

        // Resolve the absolute file path from the stored relative URL
        const filePath = path.join(__dirname, '../../', record.file_url);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Determine Content-Type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline'); // prevent download prompt

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);

        stream.on('error', (err) => {
            console.error('Stream error:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error streaming file' });
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/records/:id/archive
 * Soft-delete a medical record (set is_archived = true).
 */
const archiveRecord = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `UPDATE medical_records
             SET is_archived = TRUE
             WHERE id = $1 AND patient_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record not found or not owned by you' });
        }

        res.json({ success: true, message: 'Record archived', record: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/records/:id/restore
 * Restore an archived medical record (set is_archived = false).
 */
const restoreRecord = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `UPDATE medical_records
             SET is_archived = FALSE
             WHERE id = $1 AND patient_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record not found or not owned by you' });
        }

        res.json({ success: true, message: 'Record restored', record: rows[0] });
    } catch (err) {
        next(err);
    }
};

module.exports = { uploadRecord, getRecords, getPatientRecords, streamRecord, archiveRecord, restoreRecord };
