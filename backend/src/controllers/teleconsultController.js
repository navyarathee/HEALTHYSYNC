const pool = require('../config/db');
const crypto = require('crypto');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

/**
 * GET /api/appointments/join/:id
 * Validates the appointment session time and returns the mock teleconsult link.
 * Session window: 15 minutes before to the appointment end (30 min after start).
 */
const joinSession = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            `SELECT * FROM appointments WHERE id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = rows[0];

        // Only participant can join
        if (appointment.patient_id !== req.user.id && appointment.provider_id !== req.user.id) {
            return res.status(403).json({ message: 'You are not a participant in this appointment' });
        }

        // Must be confirmed
        if (appointment.status !== 'CONFIRMED') {
            return res.status(400).json({
                message: `Appointment is ${appointment.status.toLowerCase()}. Only confirmed appointments can be joined.`,
            });
        }

        // Validate session time window (15 min before → 30 min after start)
        const now = dayjs().utc();
        const appointmentTime = dayjs(appointment.date_time).utc();
        const windowStart = appointmentTime.subtract(15, 'minute');
        const windowEnd = appointmentTime.add(30, 'minute');

        if (now.isBefore(windowStart) || now.isAfter(windowEnd)) {
            return res.status(400).json({
                message: 'Session is not active yet. You can join 15 minutes before the scheduled time.',
                scheduledAt: appointment.date_time,
                windowStart: windowStart.toISOString(),
                windowEnd: windowEnd.toISOString(),
            });
        }

        // Return the teleconsult link (rewriting old placeholder links dynamically)
        let teleconsultLink = appointment.teleconsult_link;
        if (!teleconsultLink || teleconsultLink.includes('healthsync.io/join/')) {
            teleconsultLink = `https://meet.jit.si/HealthSync-Telehealth-${appointment.id}`;
        }
        res.json({
            success: true,
            appointmentId: appointment.id,
            teleconsultLink,
            scheduledAt: appointment.date_time,
            provider_id: appointment.provider_id,
            patient_id: appointment.patient_id,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/teleconsult/:appointmentId/notes
 * Saves clinical notes specifically tagged as "Telehealth Session Notes".
 * Body: { content, visibility? }
 */
const saveTelehealthNotes = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { content, visibility } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'content is required' });
        }

        // Verify appointment exists
        const { rows: apptRows } = await pool.query(
            `SELECT * FROM appointments WHERE id = $1`,
            [appointmentId]
        );

        if (apptRows.length === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = apptRows[0];

        // Only the provider of this appointment can save telehealth notes
        if (appointment.provider_id !== req.user.id) {
            return res.status(403).json({ message: 'Only the assigned provider can save telehealth notes' });
        }

        const validVisibilities = ['INTERNAL', 'SHARED_WITH_PATIENT'];
        const vis = visibility && validVisibilities.includes(visibility.toUpperCase())
            ? visibility.toUpperCase()
            : 'INTERNAL';

        const { rows } = await pool.query(
            `INSERT INTO collaboration_notes (patient_id, author_id, content, visibility, appointment_id, is_telehealth_note)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING *`,
            [appointment.patient_id, req.user.id, content, vis, appointmentId]
        );

        res.status(201).json({ success: true, note: rows[0] });
    } catch (err) {
        next(err);
    }
};

module.exports = { joinSession, saveTelehealthNotes };
