const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { verifyConsent } = require('../middleware/consent');
const { logAccess } = require('../middleware/auditLogger');
const { getTimeline } = require('../controllers/timelineController');

// GET /api/patients/:id/timeline – Aggregated health timeline
// Uses :id as patientId for consent verification
// Middleware renames :id → :patientId for the consent middleware
router.get(
    '/:id/timeline',
    authenticate,
    authorize(['PATIENT', 'PROVIDER', 'ADMIN']),
    // Map :id to :patientId so verifyConsent can find it
    (req, _res, next) => {
        req.params.patientId = req.params.id;
        next();
    },
    verifyConsent,
    logAccess('RECORD_VIEW'),
    getTimeline
);

module.exports = router;
