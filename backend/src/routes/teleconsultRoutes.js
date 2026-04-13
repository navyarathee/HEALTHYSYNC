const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLogger');
const { joinSession, saveTelehealthNotes } = require('../controllers/teleconsultController');

// GET /api/teleconsult/join/:id – Validate session time and return mock video link
router.get(
    '/join/:id',
    authenticate,
    joinSession
);

// POST /api/teleconsult/:appointmentId/notes – Save telehealth session notes
router.post(
    '/:appointmentId/notes',
    authenticate,
    authorize(['PROVIDER']),
    logAccess('TELECONSULT_JOIN'),
    saveTelehealthNotes
);

module.exports = router;
