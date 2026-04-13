const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLogger');
const { getProfile, updateProfile, exportData } = require('../controllers/profileController');
const { getMyLogs } = require('../controllers/auditController');

// GET /api/profile – View own profile (Patient or Provider)
router.get('/', authenticate, authorize(['PATIENT', 'PROVIDER']), logAccess('PROFILE_VIEW'), getProfile);

// PATCH /api/profile – Update health metadata (Patient or Provider)
router.patch('/', authenticate, authorize(['PATIENT', 'PROVIDER']), logAccess('PROFILE_UPDATE'), updateProfile);

// GET /api/profile/export – Download all patient data as JSON (Patient only)
router.get('/export', authenticate, authorize(['PATIENT']), exportData);

// GET /api/profile/my-logs – View who accessed my data (Patient only)
router.get('/my-logs', authenticate, authorize(['PATIENT']), getMyLogs);

module.exports = router;
