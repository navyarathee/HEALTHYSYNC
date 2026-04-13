const pool = require('../config/db');

/**
 * GET /api/notifications
 * Fetch notifications for the authenticated user (paginated, newest first).
 * Query: ?limit=20&offset=0
 */
const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;

        const { rows } = await pool.query(
            `SELECT * FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await pool.query(
            'SELECT COUNT(*)::INTEGER AS total FROM notifications WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            total: countResult.rows[0].total,
            notifications: rows,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications for the authenticated user.
 */
const getUnreadCount = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT COUNT(*)::INTEGER AS unread
             FROM notifications
             WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );

        res.json({ success: true, unread: rows[0].unread });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { rows } = await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ success: true, notification: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
const markAllRead = async (req, res, next) => {
    try {
        const result = await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );

        res.json({
            success: true,
            message: `${result.rowCount} notification(s) marked as read`,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Helper: Create a notification (used by other controllers).
 * @param {string} userId - target user
 * @param {string} type - notification_type enum value
 * @param {string} title
 * @param {string} message
 * @param {string|null} referenceId - optional related entity ID
 */
const createNotification = async (userId, type, title, message, referenceId = null) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, type, title, message, referenceId]
        );
    } catch (err) {
        // Notification creation failure should not break the calling flow
        console.error('⚠️  Notification creation failed:', err.message);
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllRead,
    createNotification,
};
