const rateLimit = require('express-rate-limit');

/**
 * Auth limiter – 10 requests per 15 minutes.
 * Applies to /api/auth/login and /api/auth/register.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts. Please try again after 15 minutes.',
    },
});

/**
 * OTP limiter – 5 requests per 15 minutes.
 * Applies to /api/auth/2fa/verify.
 */
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many OTP attempts. Please try again after 15 minutes.',
    },
});

/**
 * Refresh limiter – 30 requests per 15 minutes.
 * Applies to /api/auth/refresh.
 */
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many refresh requests. Please try again later.',
    },
});

/**
 * General limiter – 100 requests per 15 minutes.
 * Applied globally as a fallback.
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.',
    },
});

module.exports = { authLimiter, otpLimiter, refreshLimiter, generalLimiter };
