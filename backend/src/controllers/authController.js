const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

const ACCESS_TOKEN_EXPIRY = '15m';       // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7;     // Long-lived refresh token

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate a cryptographically random refresh token string.
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString('hex');
};

/**
 * Hash a refresh token for storage.
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Issue an access + refresh token pair.
 * Stores the hashed refresh token in the DB and sets the HttpOnly cookie.
 */
const issueTokenPair = async (user, res, family = null) => {
    // 1. Access token (short-lived, returned in response body)
    const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // 2. Refresh token (long-lived, sent as HttpOnly cookie)
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const tokenFamily = family || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, tokenHash, tokenFamily, expiresAt]
    );

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });

    return { accessToken, tokenFamily };
};

/**
 * POST /api/auth/register
 * Body: { email, password, role }
 */
const register = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const validRoles = ['PATIENT', 'PROVIDER', 'ADMIN'];
        const userRole = role && validRoles.includes(role.toUpperCase())
            ? role.toUpperCase()
            : 'PATIENT';

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const { rows } = await pool.query(
            `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
            [email, passwordHash, userRole]
        );

        const user = rows[0];

        await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [user.id]);

        // Issue dual token pair
        const { accessToken } = await issueTokenPair(user, res);

        res.status(201).json({
            success: true,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.created_at,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * If 2FA is enabled → returns { status: 'partial_success', temp2FAToken }
 * If 2FA is disabled → issues access + refresh token pair
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const { rows } = await pool.query(
            'SELECT id, email, password_hash, role, is_2fa_enabled FROM users WHERE email = $1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // ── 2FA check ──────────────────────────────────────────
        if (user.is_2fa_enabled) {
            // Generate OTP
            const otp = generateOTP();
            const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

            // Clear old OTPs for this user
            await pool.query('DELETE FROM two_factor_auth WHERE user_id = $1', [user.id]);

            // Store new OTP
            await pool.query(
                `INSERT INTO two_factor_auth (user_id, otp_hash, expires_at)
         VALUES ($1, $2, $3)`,
                [user.id, otpHash, expiresAt]
            );

            // Generate a short-lived temp token (5 min) for 2FA verification
            const temp2FAToken = jwt.sign(
                { userId: user.id, purpose: '2fa' },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );

            // In production, you'd send the OTP via email/SMS.
            console.log(`🔐 2FA OTP for ${user.email}: ${otp}`);

            return res.json({
                status: 'partial_success',
                message: '2FA required. Submit your OTP to /api/auth/2fa/verify',
                temp2FAToken,
                // Remove the line below in production:
                _devOTP: otp,
            });
        }

        // ── No 2FA — issue dual token pair ──────────────────────
        const { accessToken } = await issueTokenPair(user, res);

        res.json({
            success: true,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/2fa/verify
 * Body: { otp }
 * Header: Authorization: Bearer <temp2FAToken>
 *
 * Validates the OTP against the two_factor_auth table.
 * On success: issues the dual access + refresh token pair.
 */
const verify2FA = async (req, res, next) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ message: 'OTP is required' });
        }

        // ── Verify the temporary 2FA token ─────────────────────
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Temporary 2FA token is required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ message: 'Invalid or expired 2FA token' });
        }

        if (decoded.purpose !== '2fa') {
            return res.status(401).json({ message: 'Invalid token purpose' });
        }

        // ── Find the OTP record ────────────────────────────────
        const { rows } = await pool.query(
            `SELECT * FROM two_factor_auth
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'OTP expired or not found. Please login again.' });
        }

        const otpRecord = rows[0];

        // ── Check attempt limit ────────────────────────────────
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await pool.query('DELETE FROM two_factor_auth WHERE id = $1', [otpRecord.id]);
            return res.status(429).json({
                message: 'Too many failed attempts. Please login again.',
            });
        }

        // ── Verify OTP ─────────────────────────────────────────
        const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

        if (!isValid) {
            await pool.query(
                'UPDATE two_factor_auth SET attempts = attempts + 1 WHERE id = $1',
                [otpRecord.id]
            );
            return res.status(401).json({
                message: 'Invalid OTP',
                attemptsRemaining: MAX_OTP_ATTEMPTS - otpRecord.attempts - 1,
            });
        }

        // ── Success — clean up and issue dual token pair ───────
        await pool.query('DELETE FROM two_factor_auth WHERE user_id = $1', [decoded.userId]);

        // Fetch user info
        const userResult = await pool.query(
            'SELECT id, email, role FROM users WHERE id = $1',
            [decoded.userId]
        );
        const user = userResult.rows[0];

        const { accessToken } = await issueTokenPair(user, res);

        res.json({
            success: true,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/refresh
 * Cookie: refreshToken
 *
 * Exchanges a valid refresh token for a new access + refresh token pair.
 * Implements rotation: the old refresh token is revoked.
 * If a revoked token is reused, the entire token family is invalidated (breach detection).
 */
const refreshAccessToken = async (req, res, next) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken;

        if (!rawRefreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        const tokenHash = hashToken(rawRefreshToken);

        // ── Find the token in DB ────────────────────────────────
        const { rows } = await pool.query(
            `SELECT rt.*, u.id AS uid, u.email, u.role
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1`,
            [tokenHash]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const storedToken = rows[0];

        // ── Breach detection: if token was already revoked ──────
        if (storedToken.is_revoked) {
            // Someone reused an old token — revoke the ENTIRE family
            await pool.query(
                'UPDATE refresh_tokens SET is_revoked = TRUE WHERE family = $1',
                [storedToken.family]
            );
            // Clear cookie
            res.clearCookie('refreshToken', { path: '/api/auth' });

            console.warn(`🚨 Refresh token reuse detected for user ${storedToken.uid}! Entire family revoked.`);
            return res.status(401).json({
                message: 'Suspicious activity detected. All sessions have been revoked. Please login again.',
            });
        }

        // ── Check expiry ────────────────────────────────────────
        if (new Date(storedToken.expires_at) < new Date()) {
            await pool.query(
                'UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1',
                [storedToken.id]
            );
            res.clearCookie('refreshToken', { path: '/api/auth' });
            return res.status(401).json({ message: 'Refresh token has expired. Please login again.' });
        }

        // ── Revoke the old token (rotation) ─────────────────────
        await pool.query(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1',
            [storedToken.id]
        );

        // ── Issue new pair with the SAME family ─────────────────
        const user = { id: storedToken.uid, email: storedToken.email, role: storedToken.role };
        const { accessToken } = await issueTokenPair(user, res, storedToken.family);

        res.json({
            success: true,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/logout
 * Cookie: refreshToken  (or Authorization header)
 *
 * Invalidates the refresh token family and clears cookies.
 */
const logout = async (req, res, next) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken;

        if (rawRefreshToken) {
            const tokenHash = hashToken(rawRefreshToken);

            // Find the token to get the family
            const { rows } = await pool.query(
                'SELECT family FROM refresh_tokens WHERE token_hash = $1',
                [tokenHash]
            );

            if (rows.length > 0) {
                // Revoke the entire family
                await pool.query(
                    'UPDATE refresh_tokens SET is_revoked = TRUE WHERE family = $1',
                    [rows[0].family]
                );
            }
        }

        // Clear cookies
        res.clearCookie('refreshToken', { path: '/api/auth' });
        res.clearCookie('token');

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/2fa/enable
 * Authenticated user enables 2FA on their account.
 */
const enable2FA = async (req, res, next) => {
    try {
        await pool.query(
            'UPDATE users SET is_2fa_enabled = TRUE WHERE id = $1',
            [req.user.id]
        );
        res.json({ success: true, message: '2FA has been enabled' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/2fa/disable
 * Authenticated user disables 2FA on their account.
 */
const disable2FA = async (req, res, next) => {
    try {
        await pool.query(
            'UPDATE users SET is_2fa_enabled = FALSE WHERE id = $1',
            [req.user.id]
        );
        await pool.query('DELETE FROM two_factor_auth WHERE user_id = $1', [req.user.id]);
        res.json({ success: true, message: '2FA has been disabled' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/change-password
 * Authenticated user changes their password.
 * Body: { currentPassword, newPassword }
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        // Fetch current password hash
        const { rows } = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash and store new password
        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newHash, req.user.id]
        );

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
    verify2FA,
    enable2FA,
    disable2FA,
    refreshAccessToken,
    logout,
    changePassword,
};
