const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditController');
const { getSystemHealth } = require('../controllers/governanceController');
const {
    getAdminDashboard,
    getVerificationQueue,
    verifyProvider,
    getGlobalAuditStream,
    addAdminNote,
    suspendUser,
    unsuspendUser,
    editCredentials,
    sendBroadcast,
    getLicenseImage,
    getUserList,
} = require('../controllers/adminController');

// All admin routes require authentication + ADMIN role
const adminAuth = [authenticate, authorize(['ADMIN'])];

// ── Existing routes (preserved) ─────────────────────────────
// GET /api/admin/audit-logs – View system-wide access patterns (Admin only)
router.get('/audit-logs', ...adminAuth, getAuditLogs);

// GET /api/admin/system-health – Governance & analytics dashboard (Admin only)
router.get('/system-health', ...adminAuth, getSystemHealth);

// ── Phase 8: Admin Governance routes ────────────────────────

// Dashboard tiles (The Pulse)
router.get('/dashboard', ...adminAuth, getAdminDashboard);

// Provider verification queue
router.get('/verification-queue', ...adminAuth, getVerificationQueue);
router.post('/verify/:userId', ...adminAuth, verifyProvider);

// Global audit stream with admin notes
router.get('/audit-stream', ...adminAuth, getGlobalAuditStream);
router.post('/audit-logs/:logId/note', ...adminAuth, addAdminNote);

// User management (suspend / unsuspend / credential edit)
router.get('/users', ...adminAuth, getUserList);
router.post('/users/:userId/suspend', ...adminAuth, suspendUser);
router.post('/users/:userId/unsuspend', ...adminAuth, unsuspendUser);
router.patch('/users/:userId/credentials', ...adminAuth, editCredentials);

// License audit
router.get('/users/:userId/license', ...adminAuth, getLicenseImage);

// System broadcast
router.post('/broadcast', ...adminAuth, sendBroadcast);

module.exports = router;
