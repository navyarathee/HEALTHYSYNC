const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, verify2FASchema, changePasswordSchema } = require('../middleware/schemas');
const { authLimiter, otpLimiter, refreshLimiter } = require('../middleware/rateLimiter');
const {
    register,
    login,
    verify2FA,
    enable2FA,
    disable2FA,
    refreshAccessToken,
    logout,
    changePassword,
} = require('../controllers/authController');

// POST /api/auth/register – Create new account (Public, rate-limited, validated)
router.post('/register', authLimiter, validate(registerSchema), register);

// POST /api/auth/login – Authenticate & return JWT (Public, rate-limited, validated)
router.post('/login', authLimiter, validate(loginSchema), login);

// POST /api/auth/2fa/verify – Finalize login with OTP (Public w/ temp token, rate-limited, validated)
router.post('/2fa/verify', otpLimiter, validate(verify2FASchema), verify2FA);

// POST /api/auth/refresh – Exchange refresh token for new pair (Public, rate-limited)
router.post('/refresh', refreshLimiter, refreshAccessToken);

// POST /api/auth/logout – Invalidate session (Authenticated)
router.post('/logout', authenticate, logout);

// POST /api/auth/2fa/enable – Enable 2FA (Authenticated)
router.post('/2fa/enable', authenticate, enable2FA);

// POST /api/auth/2fa/disable – Disable 2FA (Authenticated)
router.post('/2fa/disable', authenticate, disable2FA);

// POST /api/auth/change-password – Change password (Authenticated, validated)
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;
