const cron = require('node-cron');
const pool = require('../config/db');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

/**
 * Appointment Reminder Cron Job
 * Runs every hour. Finds CONFIRMED appointments within the next 24 hours
 * and logs a mock reminder (simulating email/notification).
 */
const startReminderJob = () => {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ [Cron] Running appointment reminder check…');

        try {
            const now = dayjs().utc().toISOString();
            const in24Hours = dayjs().utc().add(24, 'hour').toISOString();

            const { rows: upcoming } = await pool.query(
                `SELECT a.id, a.date_time, a.type,
                        pp.full_name AS patient_name, pu.email AS patient_email,
                        pv.full_name AS provider_name
                 FROM appointments a
                 LEFT JOIN profiles pp ON pp.user_id = a.patient_id
                 LEFT JOIN users pu ON pu.id = a.patient_id
                 LEFT JOIN profiles pv ON pv.user_id = a.provider_id
                 WHERE a.status = 'CONFIRMED'
                   AND a.date_time >= $1
                   AND a.date_time <= $2`,
                [now, in24Hours]
            );

            if (upcoming.length === 0) {
                console.log('⏰ [Cron] No upcoming appointments in the next 24 hours.');
                return;
            }

            for (const appt of upcoming) {
                // Mock reminder — in production this would be an email or push notification
                console.log(
                    `📧 [Reminder] Patient: ${appt.patient_name || 'N/A'} (${appt.patient_email || 'N/A'}) — ` +
                    `${appt.type} appointment with ${appt.provider_name || 'N/A'} ` +
                    `at ${dayjs(appt.date_time).format('YYYY-MM-DD HH:mm')} UTC`
                );
            }

            console.log(`⏰ [Cron] Sent ${upcoming.length} reminder(s).`);
        } catch (err) {
            console.error('⏰ [Cron] Reminder job failed:', err.message);
        }
    });

    console.log('⏰ Appointment reminder cron job scheduled (runs every hour).');
};

module.exports = { startReminderJob };
