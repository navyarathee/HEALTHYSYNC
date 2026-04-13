const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLogger');
const {
    grantConsent,
    revokeConsent,
    getActiveConsents,
} = require('../controllers/consentController');

// POST /api/consent/grant – Patient grants access to a provider
router.post(
    '/grant',
    authenticate,
    authorize(['PATIENT']),
    logAccess('CONSENT_GRANT'),
    grantConsent
);

// DELETE /api/consent/revoke/:id – Immediate revocation
router.delete(
    '/revoke/:id',
    authenticate,
    authorize(['PATIENT']),
    logAccess('CONSENT_REVOKE'),
    revokeConsent
);

// GET /api/consent/active – List providers who have access
router.get(
    '/active',
    authenticate,
    authorize(['PATIENT']),
    getActiveConsents
);

module.exports = router;
