const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// ── Route imports ───────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const recordRoutes = require('./routes/recordRoutes');
const consentRoutes = require('./routes/consentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const timelineRoutes = require('./routes/timelineRoutes');
const collabRoutes = require('./routes/collabRoutes');
const teleconsultRoutes = require('./routes/teleconsultRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const providerRoutes = require('./routes/providerRoutes');

const app = express();

// Trust the first proxy (e.g., Vite dev server, load balancer) 
// so that req.ip correctly reflects the client's IP address
// and rate limiting works per user instead of blocking the whole proxy.
app.set('trust proxy', 1);

// ── Global middleware ───────────────────────────────────────
app.use(helmet());                           // Security headers (XSS, clickjacking)
app.use(generalLimiter);                     // Global rate limiter (100 req / 15 min)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', timelineRoutes);
app.use('/api/collab', collabRoutes);
app.use('/api/teleconsult', teleconsultRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/providers', providerRoutes);

// ── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;

