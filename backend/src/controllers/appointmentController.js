const pool = require('../config/db');
const crypto = require('crypto');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * POST /api/appointments
 * Create a new appointment. Patient requests a slot with a specific provider.
 * Includes 30-minute conflict detection for the provider.
 */
const createAppointment = async (req, res, next) => {
    try {
        const { providerId, dateTime, type, notes, teleconsultLink } = req.body;

        if (!providerId || !dateTime) {
            return res.status(400).json({ message: 'providerId and dateTime are required' });
        }

        const validTypes = ['FOLLOW_UP', 'CONSULTATION', 'EMERGENCY'];
        const appointmentType = type ? type.toUpperCase() : 'CONSULTATION';
        if (!validTypes.includes(appointmentType)) {
            return res.status(400).json({
                message: `type must be one of: ${validTypes.join(', ')}`,
            });
        }

        // Verify provider exists and has PROVIDER role
        const { rows: providerRows } = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND role = 'PROVIDER'`,
            [providerId]
        );
        if (providerRows.length === 0) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // ── Conflict detection: 30-minute window ────────────────
        const requestedTime = dayjs(dateTime).utc();
        const windowStart = requestedTime.subtract(30, 'minute').toISOString();
        const windowEnd = requestedTime.add(30, 'minute').toISOString();

        const { rows: conflicts } = await pool.query(
            `SELECT id, date_time FROM appointments
             WHERE provider_id = $1
               AND status = 'CONFIRMED'
               AND date_time >= $2
               AND date_time <= $3`,
            [providerId, windowStart, windowEnd]
        );

        if (conflicts.length > 0) {
            return res.status(409).json({
                message: 'Time slot conflict. The provider has an existing appointment within 30 minutes of the requested time.',
                conflictingSlot: conflicts[0].date_time,
            });
        }

        // ── Auto-generate teleconsult link if not provided ──────
        const generatedLink = teleconsultLink || `https://meet.jit.si/HealthSync-Telehealth-${crypto.randomUUID()}`;

        // ── Insert the appointment ──────────────────────────────
        const { rows } = await pool.query(
            `INSERT INTO appointments (patient_id, provider_id, date_time, status, type, notes, teleconsult_link)
             VALUES ($1, $2, $3, 'PENDING', $4, $5, $6)
             RETURNING *`,
            [req.user.id, providerId, requestedTime.toISOString(), appointmentType, notes || null, generatedLink]
        );

        res.status(201).json({ success: true, appointment: rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/appointments/:id
 * Update appointment status (Confirm / Cancel / Complete).
 * - Cancellation requires cancellationReason.
 * - COMPLETED transition logs to audit.
 */
const updateAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, cancellationReason, notes, teleconsultLink } = req.body;

        // Fetch existing appointment
        const { rows: existing } = await pool.query(
            `SELECT * FROM appointments WHERE id = $1`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = existing[0];

        // Authorization: only the patient or provider involved can update
        if (appointment.patient_id !== req.user.id && appointment.provider_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'You are not authorized to update this appointment' });
        }

        const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
        if (status && !validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({
                message: `status must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const newStatus = status ? status.toUpperCase() : appointment.status;

        // Cancellation must include a reason
        if (newStatus === 'CANCELLED' && !cancellationReason) {
            return res.status(400).json({ message: 'cancellationReason is required when cancelling' });
        }

        // ── Conflict check if confirming ────────────────────────
        if (newStatus === 'CONFIRMED' && appointment.status !== 'CONFIRMED') {
            const requestedTime = dayjs(appointment.date_time).utc();
            const windowStart = requestedTime.subtract(30, 'minute').toISOString();
            const windowEnd = requestedTime.add(30, 'minute').toISOString();

            const { rows: conflicts } = await pool.query(
                `SELECT id FROM appointments
                 WHERE provider_id = $1
                   AND status = 'CONFIRMED'
                   AND date_time >= $2
                   AND date_time <= $3
                   AND id != $4`,
                [appointment.provider_id, windowStart, windowEnd, id]
            );

            if (conflicts.length > 0) {
                return res.status(409).json({
                    message: 'Cannot confirm — time slot conflict with another confirmed appointment.',
                });
            }
        }

        // ── Update the appointment ──────────────────────────────
        const { rows: updated } = await pool.query(
            `UPDATE appointments
             SET status = $1,
                 cancellation_reason = COALESCE($2, cancellation_reason),
                 notes = COALESCE($3, notes),
                 teleconsult_link = COALESCE($4, teleconsult_link),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [newStatus, cancellationReason || null, notes || null, teleconsultLink || null, id]
        );

        // ── Audit log for COMPLETED transition ──────────────────
        if (newStatus === 'COMPLETED' && appointment.status !== 'COMPLETED') {
            const ipAddress =
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.socket?.remoteAddress ||
                'unknown';

            await pool.query(
                `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, ip_address, details)
                 VALUES ($1, 'APPOINTMENT_UPDATE', $2, 'appointment', $3, $4)`,
                [
                    req.user.id,
                    id,
                    ipAddress,
                    JSON.stringify({
                        previousStatus: appointment.status,
                        newStatus: 'COMPLETED',
                        note: 'Visit completed — added to visit history',
                    }),
                ]
            );
        }

        res.json({ success: true, appointment: updated[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/appointments/me
 * Fetch appointments for the authenticated user.
 * Patients see their own; Providers see appointments assigned to them.
 */
const getMyAppointments = async (req, res, next) => {
    try {
        let query;
        let params;

        if (req.user.role === 'PATIENT') {
            query = `SELECT a.*, p.full_name AS provider_name
                     FROM appointments a
                     LEFT JOIN profiles p ON p.user_id = a.provider_id
                     WHERE a.patient_id = $1
                     ORDER BY a.date_time DESC`;
            params = [req.user.id];
        } else if (req.user.role === 'PROVIDER') {
            query = `SELECT a.*, p.full_name AS patient_name
                     FROM appointments a
                     LEFT JOIN profiles p ON p.user_id = a.patient_id
                     WHERE a.provider_id = $1
                     ORDER BY a.date_time DESC`;
            params = [req.user.id];
        } else {
            // ADMIN sees all
            query = `SELECT a.*, pp.full_name AS patient_name, pv.full_name AS provider_name
                     FROM appointments a
                     LEFT JOIN profiles pp ON pp.user_id = a.patient_id
                     LEFT JOIN profiles pv ON pv.user_id = a.provider_id
                     ORDER BY a.date_time DESC`;
            params = [];
        }

        const { rows } = await pool.query(query, params);
        res.json({ success: true, count: rows.length, appointments: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { createAppointment, updateAppointment, getMyAppointments };
