/**
 * Global error handler – catches unhandled errors from route handlers.
 */
const errorHandler = (err, req, res, _next) => {
    console.error('🔥 Error:', err.stack || err.message);

    const statusCode = err.statusCode || 500;
    const message =
        process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
    });
};

module.exports = errorHandler;
