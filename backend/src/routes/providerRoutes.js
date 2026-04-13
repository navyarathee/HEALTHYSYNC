const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { searchProviders } = require('../controllers/providerController');

// GET /api/providers/search?q=<query> – Search providers (PATIENT only)
router.get('/search', authenticate, authorize(['PATIENT']), searchProviders);

module.exports = router;
