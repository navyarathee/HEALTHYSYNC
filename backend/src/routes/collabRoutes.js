const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { verifyConsent } = require('../middleware/consent');
const { logAccess } = require('../middleware/auditLogger');
const { createCollabNote, getCollabNotes } = require('../controllers/collabController');

// POST /api/collab/notes – Provider adds a shared note to a patient case
// The patientId comes from the request body, so we inject it into params for verifyConsent
router.post(
    '/notes',
    authenticate,
    authorize(['PROVIDER']),
    (req, res, next) => {
        // verifyConsent expects patientId in params
        req.params.patientId = req.body.patientId;
        next();
    },
    verifyConsent,
    logAccess('COLLAB_NOTE_CREATE'),
    createCollabNote
);

// GET /api/collab/notes/:patientId – Fetch case discussion thread for a patient
router.get(
    '/notes/:patientId',
    authenticate,
    authorize(['PATIENT', 'PROVIDER', 'ADMIN']),
    verifyConsent,
    logAccess('COLLAB_NOTE_VIEW'),
    getCollabNotes
);

module.exports = router;
