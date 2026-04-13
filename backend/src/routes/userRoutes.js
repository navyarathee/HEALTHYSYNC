const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMe, getProviders, getPatients } = require('../controllers/userController');

// GET /api/users/me – Get current user info (Authenticated)
router.get('/me', authenticate, getMe);

// GET /api/users/providers – List all provider users (Authenticated)
router.get('/providers', authenticate, getProviders);

// GET /api/users/patients - List all patient users (Authenticated)
router.get('/patients', authenticate, getPatients);

module.exports = router;
