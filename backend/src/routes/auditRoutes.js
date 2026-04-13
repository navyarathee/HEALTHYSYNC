const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getMyLogs } = require('../controllers/auditController');

// GET /api/audit/me – Patient views their own access history logs
router.get(
    '/me',
    authenticate,
    authorize(['PATIENT']),
    getMyLogs
);

module.exports = router;
