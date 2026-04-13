const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLogger');
const {
    createAppointment,
    updateAppointment,
    getMyAppointments,
} = require('../controllers/appointmentController');

// POST /api/appointments – Request a new appointment slot (Patient only)
router.post(
    '/',
    authenticate,
    authorize(['PATIENT']),
    logAccess('APPOINTMENT_CREATE'),
    createAppointment
);

// PATCH /api/appointments/:id – Confirm / Cancel / Complete (Provider or Patient)
router.patch(
    '/:id',
    authenticate,
    authorize(['PATIENT', 'PROVIDER', 'ADMIN']),
    logAccess('APPOINTMENT_UPDATE'),
    updateAppointment
);

// GET /api/appointments/me – Fetch personal schedule (any authenticated user)
router.get(
    '/me',
    authenticate,
    getMyAppointments
);

module.exports = router;
