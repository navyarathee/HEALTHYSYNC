const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { verifyConsent } = require('../middleware/consent');
const { logAccess } = require('../middleware/auditLogger');
const upload = require('../middleware/upload');
const { compressUpload } = require('../middleware/compress');
const { uploadRecord, getRecords, getPatientRecords, streamRecord, archiveRecord, restoreRecord } = require('../controllers/recordController');

// POST /api/records – Upload a new record (Patient or Provider)
router.post(
    '/',
    authenticate,
    authorize(['PATIENT', 'PROVIDER']),
    logAccess('RECORD_UPLOAD'),
    upload.single('file'),
    compressUpload,
    uploadRecord
);

// GET /api/records – Fetch list of own records (Authenticated)
router.get('/', authenticate, getRecords);

// GET /api/records/:id/stream – Stream file for secure previewer
// Looks up the record's patient_id so consent middleware can verify access
router.get(
    '/:id/stream',
    authenticate,
    authorize(['PATIENT', 'PROVIDER', 'ADMIN']),
    async (req, res, next) => {
        try {
            const pool = require('../config/db');
            const { rows } = await pool.query(
                'SELECT patient_id FROM medical_records WHERE id = $1',
                [req.params.id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Record not found' });
            }
            req.params.patientId = rows[0].patient_id;
            next();
        } catch (err) {
            next(err);
        }
    },
    verifyConsent,
    logAccess('RECORD_VIEW'),
    streamRecord
);

// GET /api/records/:patientId – Fetch a specific patient's records
// Full middleware stack: Authenticate → Authorize → VerifyConsent → LogAccess → Controller
router.get(
    '/:patientId',
    authenticate,
    authorize(['PATIENT', 'PROVIDER', 'ADMIN']),
    verifyConsent,
    logAccess('RECORD_VIEW'),
    getPatientRecords
);

// PATCH /api/records/:id/archive – Soft-delete a record (Patient only)
router.patch('/:id/archive', authenticate, authorize(['PATIENT']), archiveRecord);

// PATCH /api/records/:id/restore – Restore an archived record (Patient only)
router.patch('/:id/restore', authenticate, authorize(['PATIENT']), restoreRecord);

module.exports = router;
