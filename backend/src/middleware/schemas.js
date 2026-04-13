const { z } = require('zod');

// ── Auth schemas ────────────────────────────────────────────

const registerSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email format'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters'),
    role: z
        .enum(['PATIENT', 'PROVIDER', 'ADMIN'])
        .optional()
        .transform((val) => val?.toUpperCase()),
});

const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email format'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required'),
});

const verify2FASchema = z.object({
    otp: z
        .string({ required_error: 'OTP is required' })
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

const changePasswordSchema = z.object({
    currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, 'Current password is required'),
    newPassword: z
        .string({ required_error: 'New password is required' })
        .min(6, 'New password must be at least 6 characters'),
});

module.exports = {
    registerSchema,
    loginSchema,
    verify2FASchema,
    changePasswordSchema,
};
