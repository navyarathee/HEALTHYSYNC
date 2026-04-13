require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const pool = require('./src/config/db');
const { startReminderJob } = require('./src/cron/reminderJob');

const PORT = process.env.PORT || 5001;

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const start = async () => {
    try {
        // Verify database connection
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Connected to NeonDB at', res.rows[0].now);

        app.listen(PORT, () => {
            console.log(`🚀 HealthSync server running on http://localhost:${PORT}`);
        });

        // Start the appointment reminder cron job
        startReminderJob();
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

start();
