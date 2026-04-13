const pool = require('../config/db');

/**
 * GET /api/patients/:id/timeline
 * Aggregates data from medical_records, appointments, collaboration_notes,
 * and audit_logs into a unified, sorted timeline feed.
 *
 * Query params:
 *   - limit  (default: 50)
 *   - offset (default: 0)
 */
const getTimeline = async (req, res, next) => {
    try {
        const patientId = req.params.id;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;

        // Run all four queries in parallel for performance
        const [recordsResult, appointmentsResult, notesResult, auditResult] = await Promise.all([
            // 1. Medical record events
            pool.query(
                `SELECT id, title, category, tags, created_at AS date
                 FROM medical_records
                 WHERE patient_id = $1
                 ORDER BY created_at DESC`,
                [patientId]
            ),

            // 2. Appointment events
            pool.query(
                `SELECT a.id, a.type, a.status, a.date_time AS date, a.notes,
                        p.full_name AS provider_name
                 FROM appointments a
                 LEFT JOIN profiles p ON p.user_id = a.provider_id
                 WHERE a.patient_id = $1
                 ORDER BY a.date_time DESC`,
                [patientId]
            ),

            // 3. Collaboration notes events
            pool.query(
                `SELECT cn.id, cn.content, cn.visibility, cn.is_telehealth_note,
                        cn.created_at AS date,
                        p.full_name AS author_name
                 FROM collaboration_notes cn
                 LEFT JOIN profiles p ON p.user_id = cn.author_id
                 WHERE cn.patient_id = $1
                 ORDER BY cn.created_at DESC`,
                [patientId]
            ),

            // 4. Audit log events (clinical actions only)
            pool.query(
                `SELECT id, action, details, created_at AS date
                 FROM audit_logs
                 WHERE resource_id = $1
                   AND action IN ('RECORD_VIEW', 'RECORD_UPLOAD', 'CONSENT_GRANT',
                                  'CONSENT_REVOKE', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE',
                                  'EMERGENCY_OVERRIDE')
                 ORDER BY created_at DESC
                 LIMIT 50`,
                [patientId]
            ),
        ]);

        // Transform into a unified event format
        const events = [];

        for (const r of recordsResult.rows) {
            events.push({
                type: 'RECORD',
                date: r.date,
                summary: `Record uploaded: ${r.title} (${r.category})`,
                details: { id: r.id, category: r.category, tags: r.tags },
            });
        }

        for (const a of appointmentsResult.rows) {
            events.push({
                type: 'APPOINTMENT',
                date: a.date,
                summary: `${a.type} appointment – ${a.status}${a.provider_name ? ` with ${a.provider_name}` : ''}`,
                details: { id: a.id, status: a.status, type: a.type, notes: a.notes },
            });
        }

        for (const n of notesResult.rows) {
            const noteType = n.is_telehealth_note ? 'Telehealth note' : 'Collaboration note';
            events.push({
                type: 'COLLAB_NOTE',
                date: n.date,
                summary: `${noteType} by ${n.author_name || 'Unknown'} (${n.visibility})`,
                details: {
                    id: n.id,
                    content: n.content,
                    visibility: n.visibility,
                    isTelehealthNote: n.is_telehealth_note,
                    authorName: n.author_name,
                },
            });
        }

        for (const l of auditResult.rows) {
            events.push({
                type: 'AUDIT',
                date: l.date,
                summary: `Action: ${l.action}`,
                details: { id: l.id, action: l.action, ...(l.details || {}) },
            });
        }

        // Sort all events by date descending
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Apply pagination
        const paginatedEvents = events.slice(offset, offset + limit);

        res.json({
            success: true,
            patientId,
            total: events.length,
            limit,
            offset,
            count: paginatedEvents.length,
            timeline: paginatedEvents,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getTimeline };
