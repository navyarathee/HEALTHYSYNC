/**
 * Zod validation middleware factory.
 * Validates req.body against the provided Zod schema.
 *
 * Usage: router.post('/route', validate(mySchema), handler);
 */
const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
        }

        // Replace body with parsed (cleaned) data
        req.body = result.data;
        next();
    };
};

module.exports = { validate };
