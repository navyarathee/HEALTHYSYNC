const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllRead,
} = require('../controllers/notificationController');

// GET /api/notifications – List notifications (paginated)
router.get('/', authenticate, getNotifications);

// GET /api/notifications/unread-count – Unread count
router.get('/unread-count', authenticate, getUnreadCount);

// PATCH /api/notifications/read-all – Mark all as read
router.patch('/read-all', authenticate, markAllRead);

// PATCH /api/notifications/:id/read – Mark one as read
router.patch('/:id/read', authenticate, markAsRead);

module.exports = router;
